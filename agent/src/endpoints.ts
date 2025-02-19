import {
  DifPresentationExchangeService,
  JsonTransformer,
  Jwt,
  MdocDeviceResponse,
  RecordNotFoundError,
  TypedArrayEncoder,
  W3cJsonLdVerifiablePresentation,
  W3cJwtVerifiablePresentation,
  X509Certificate,
  X509ModuleConfig,
} from '@credo-ts/core'
import { OpenId4VcVerificationSessionState } from '@credo-ts/openid4vc'
import express, { type NextFunction, type Request, type Response } from 'express'
import z from 'zod'
import { agent } from './agent'
import { validateVerificationRequest, zValidateVerificationRequestSchema } from './ai'
import { AGENT_HOST } from './constants'
import { getIssuerIdForCredentialConfigurationId } from './issuer'
import { issuers } from './issuers'
import { getX509DcsCertificate, getX509RootCertificate } from './keyMethods'
import { oidcUrl } from './oidcProvider/provider'
import { getVerifier } from './verifier'
import { allDefinitions, verifiers } from './verifiers'

const zCreateOfferRequest = z.object({
  credentialSupportedIds: z.array(z.string()),
  authorization: z.enum(['pin', 'none', 'presentation', 'browser']).default('none'),
})

const zAddX509CertificateRequest = z.object({
  certificate: z.string(),
})

export const apiRouter = express.Router()

apiRouter.use(express.json())
apiRouter.use(express.text())
apiRouter.post('/offers/create', async (request: Request, response: Response) => {
  const createOfferRequest = zCreateOfferRequest.parse(request.body)

  // TODO: support multiple credential isuance
  const configurationId = createOfferRequest.credentialSupportedIds[0]
  const issuerId = getIssuerIdForCredentialConfigurationId(configurationId)
  const authorization = createOfferRequest.authorization
  const issuerMetadata = await agent.modules.openId4VcIssuer.getIssuerMetadata(issuerId)

  const offer = await agent.modules.openId4VcIssuer.createCredentialOffer({
    issuerId,
    offeredCredentials: createOfferRequest.credentialSupportedIds,
    preAuthorizedCodeFlowConfig:
      authorization === 'pin' || authorization === 'none'
        ? {
            authorizationServerUrl: issuerMetadata.credentialIssuer.credential_issuer,
            txCode:
              authorization === 'pin'
                ? {
                    input_mode: 'numeric',
                    length: 4,
                  }
                : undefined,
          }
        : undefined,
    authorizationCodeFlowConfig:
      authorization === 'browser' || authorization === 'presentation'
        ? {
            requirePresentationDuringIssuance: authorization === 'presentation',
            authorizationServerUrl:
              authorization === 'browser' ? oidcUrl : issuerMetadata.credentialIssuer.credential_issuer,
          }
        : undefined,
  })

  return response.json(offer)
})

apiRouter.get('/x509', async (_, response: Response) => {
  const certificate = getX509RootCertificate()
  const instance = X509Certificate.fromEncodedCertificate(certificate)
  return response.json({
    base64: instance.toString('base64'),
    pem: instance.toString('pem'),
    decoded: instance.toString('text'),
  })
})

apiRouter.post('/x509', async (request: Request, response: Response) => {
  const addX509CertificateRequest = zAddX509CertificateRequest.parse(request.body)

  const trustedCertificates = agent.dependencyManager.resolve(X509ModuleConfig).trustedCertificates
  try {
    const instance = X509Certificate.fromEncodedCertificate(addX509CertificateRequest.certificate)
    const base64 = instance.toString('base64')

    if (!trustedCertificates?.includes(base64)) {
      agent.x509.addTrustedCertificate(base64)
    }

    return response.send(instance.toString('text'))
  } catch (error) {
    return response.status(500).json({
      errorMessage: 'error adding x509 certificate',
      error,
    })
  }
})

apiRouter.get('/issuers', async (_, response: Response) => {
  return response.json(
    issuers.map((issuer) => {
      return {
        id: issuer.issuerId,
        name: issuer.display[0].name,
        tags: issuer.tags,
        logo: issuer.display[0].logo.uri,

        credentials: Object.values(issuer.credentialConfigurationsSupported).map((values) => {
          const first = Object.values(values)[0]

          return {
            display: first.configuration.display[0],
            formats: Object.fromEntries(
              Object.entries(values).map(([format, configuration]) => [
                format,
                configuration.data.credentialConfigurationId,
              ])
            ),
          }
        }),
      }
    })
  )
})

apiRouter.get('/verifier', async (_, response: Response) => {
  return response.json({
    presentationRequests: verifiers.flatMap((verifier) => [
      ...verifier.presentationRequests.map((c) => {
        return {
          useCase: 'useCase' in verifier ? verifier.useCase : undefined,
          display: `${c.name} - DIF PEX`,
          id: c.id,
        }
      }),
      ...verifier.dcqlRequests.map((c) => {
        return {
          useCase: 'useCase' in verifier ? verifier.useCase : undefined,
          display: `${c.name} - DCQL`,
          id: c.id,
        }
      }),
    ]),
  })
})

apiRouter.post('/trust-chains', async (request: Request, response: Response) => {
  const parseResult = await z
    .object({
      entityId: z.string(),
      trustAnchorEntityIds: z.array(z.string()),
    })
    .safeParseAsync(request.body)

  if (!parseResult.success) {
    return response.status(400).json({
      error: parseResult.error.message,
      details: parseResult.error.issues,
    })
  }

  const { entityId, trustAnchorEntityIds } = parseResult.data

  const chains = await agent.modules.openId4VcHolder.resolveOpenIdFederationChains({
    entityId,
    trustAnchorEntityIds: trustAnchorEntityIds as [string, ...string[]],
  })

  return response.json(chains)
})

const zCreatePresentationRequestBody = z.object({
  requestSignerType: z.enum(['x5c', 'openid-federation']),
  presentationDefinitionId: z.string(),
  requestScheme: z.string(),
  responseMode: z.enum(['direct_post.jwt', 'direct_post']),
  purpose: z.string().optional(),
})

apiRouter.post('/requests/create', async (request: Request, response: Response) => {
  const { requestSignerType, presentationDefinitionId, requestScheme, responseMode, purpose } =
    await zCreatePresentationRequestBody.parseAsync(request.body)

  const x509RootCertificate = getX509RootCertificate()
  const x509DcsCertificate = getX509DcsCertificate()

  const definitionId = presentationDefinitionId
  const definition = allDefinitions.find((d) => d.id === definitionId)
  if (!definition) {
    return response.status(404).json({
      error: 'Definition not found',
    })
  }

  const verifierId = verifiers.find(
    (a) =>
      a.presentationRequests.find((r) => r.id === definition.id) ?? a.dcqlRequests.find((r) => r.id === definition.id)
  )?.verifierId
  if (!verifierId) {
    return response.status(404).json({
      error: 'Verifier not found',
    })
  }
  const verifier = await getVerifier(verifierId)
  console.log('Requesting definition', JSON.stringify(definition, null, 2))

  const { authorizationRequest, verificationSession } =
    await agent.modules.openId4VcVerifier.createAuthorizationRequest({
      verifierId: verifier.verifierId,
      requestSigner:
        requestSignerType === 'x5c'
          ? {
              method: 'x5c',
              x5c: [x509DcsCertificate, x509RootCertificate],
              // FIXME: remove issuer param from credo as we can infer it from the url
              issuer: `${AGENT_HOST}/siop/${verifier.verifierId}/authorize`,
            }
          : {
              method: 'openid-federation',
            },
      presentationExchange:
        'input_descriptors' in definition
          ? {
              definition: {
                ...definition,
                purpose: purpose ?? definition.purpose,
              },
            }
          : undefined,
      dcql:
        'credentials' in definition
          ? {
              query: {
                ...definition,
                credential_sets:
                  purpose && definition.credential_sets
                    ? definition.credential_sets.map((set) => ({ ...set, purpose }))
                    : definition.credential_sets,
              },
            }
          : undefined,
      responseMode,
    })

  console.log(authorizationRequest)

  const authorizationRequestJwt = Jwt.fromSerializedJwt(verificationSession.authorizationRequestJwt)
  const dcqlQuery = authorizationRequestJwt.payload.additionalClaims.dcql_query
  const presentationDefinition = authorizationRequestJwt.payload.additionalClaims.presentation_definition

  return response.json({
    authorizationRequestUri: authorizationRequest.replace('openid4vp://', requestScheme),
    verificationSessionId: verificationSession.id,
    responseStatus: verificationSession.state,
    dcqlQuery: dcqlQuery ? JSON.parse(dcqlQuery as string) : undefined,
    definition: presentationDefinition,
    authorizationRequest: {
      payload: authorizationRequestJwt.payload.toJson(),
      header: authorizationRequestJwt.header,
    },
  })
})

const zReceivePresentationRequestBody = z.object({
  authorizationRequestUri: z.string().url(),
})

apiRouter.get('/requests/:verificationSessionId', async (request, response) => {
  const verificationSessionId = request.params.verificationSessionId

  try {
    const verificationSession = await agent.modules.openId4VcVerifier.getVerificationSessionById(verificationSessionId)

    const authorizationRequestJwt = Jwt.fromSerializedJwt(verificationSession.authorizationRequestJwt)
    const authorizationRequest = {
      payload: authorizationRequestJwt.payload.toJson(),
      header: authorizationRequestJwt.header,
    }
    const dcqlQuery = authorizationRequestJwt.payload.additionalClaims.dcql_query
    const presentationDefinition = authorizationRequestJwt.payload.additionalClaims.presentation_definition

    if (verificationSession.state === OpenId4VcVerificationSessionState.ResponseVerified) {
      const verified = await agent.modules.openId4VcVerifier.getVerifiedAuthorizationResponse(verificationSessionId)
      console.log(verified.presentationExchange?.presentations)
      console.log(verified.dcql?.presentationResult)

      const presentations = await Promise.all(
        (verified.presentationExchange?.presentations ?? Object.values(verified.dcql?.presentation ?? {})).map(
          async (presentation) => {
            if (presentation instanceof W3cJsonLdVerifiablePresentation) {
              return {
                pretty: presentation.toJson(),
                encoded: presentation.toJson(),
              }
            }

            if (presentation instanceof W3cJwtVerifiablePresentation) {
              return {
                pretty: JsonTransformer.toJSON(presentation.presentation),
                encoded: presentation.serializedJwt,
              }
            }

            if (presentation instanceof MdocDeviceResponse) {
              return {
                pretty: JsonTransformer.toJSON({
                  documents: presentation.documents.map((doc) => ({
                    doctype: doc.docType,
                    alg: doc.alg,
                    base64Url: doc.base64Url,
                    validityInfo: doc.validityInfo,
                    deviceSignedNamespaces: doc.deviceSignedNamespaces,
                    issuerSignedNamespaces: Object.entries(doc.issuerSignedNamespaces).map(
                      ([nameSpace, nameSpacEntries]) => [
                        nameSpace,
                        Object.entries(nameSpacEntries).map(([key, value]) =>
                          value instanceof Uint8Array
                            ? [`base64:${key}`, `data:image/jpeg;base64,${TypedArrayEncoder.toBase64(value)}`]
                            : [key, value]
                        ),
                      ]
                    ),
                  })),
                }),
                encoded: presentation.base64Url,
              }
            }

            return {
              pretty: {
                ...presentation,
                compact: undefined,
              },
              encoded: presentation.compact,
            }
          }
        ) ?? []
      )

      const dcqlSubmission = verified.dcql
        ? Object.keys(verified.dcql.presentation).map((key, index) => ({
            queryCredentialId: key,
            presentationIndex: index,
          }))
        : undefined

      console.log('presentations', presentations)

      return response.json({
        verificationSessionId: verificationSession.id,
        responseStatus: verificationSession.state,
        error: verificationSession.errorMessage,
        authorizationRequest,

        presentations: presentations,

        submission: verified.presentationExchange?.submission,
        definition: verified.presentationExchange?.definition,

        dcqlQuery: dcqlQuery ? JSON.parse(dcqlQuery as string) : undefined,
        dcqlSubmission: verified.dcql
          ? { ...verified.dcql.presentationResult, vpTokenMapping: dcqlSubmission }
          : undefined,
      })
    }

    return response.json({
      verificationSessionId: verificationSession.id,
      responseStatus: verificationSession.state,
      error: verificationSession.errorMessage,
      authorizationRequest,
      definition: presentationDefinition,
      dcqlQuery: dcqlQuery ? JSON.parse(dcqlQuery as string) : undefined,
    })
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      return response.status(404).send('Verification session not found')
    }
  }
})

apiRouter.post('/requests/receive', async (request: Request, response: Response) => {
  const receivePresentationRequestBody = zReceivePresentationRequestBody.parse(request.body)

  const resolved = await agent.modules.openId4VcHolder.resolveSiopAuthorizationRequest(
    receivePresentationRequestBody.authorizationRequestUri
  )

  if (!resolved.presentationExchange) {
    return response.status(500).json({
      error: 'Expected presentation_definition to be included in authorization request',
    })
  }

  // FIXME: expose PresentationExchange API (or allow auto-select in another way)
  const presentationExchangeService = agent.dependencyManager.resolve(DifPresentationExchangeService)

  const selectedCredentials = presentationExchangeService.selectCredentialsForRequest(
    resolved.presentationExchange?.credentialsForRequest
  )

  const { submittedResponse, serverResponse } = await agent.modules.openId4VcHolder.acceptSiopAuthorizationRequest({
    authorizationRequest: resolved.authorizationRequest,
    presentationExchange: {
      credentials: selectedCredentials,
    },
  })

  return response.status(serverResponse.status).json(submittedResponse)
})

apiRouter.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  console.error('Unhandled error', error)
  return response.status(500).json({
    error: error.message,
  })
})

apiRouter.post('/validate-verification-request', async (request: Request, response: Response) => {
  try {
    const validateVerificationRequestBody = zValidateVerificationRequestSchema.parse(request.body)
    const result = await validateVerificationRequest(validateVerificationRequestBody)
    return response.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return response.status(400).json({
        error: 'Invalid request body',
        details: error.errors,
      })
    }

    console.error('Error validating verification request:', error)
    return response.status(500).json({
      error: 'Internal server error during verification validation',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})
