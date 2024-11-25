import {
  DifPresentationExchangeService,
  JsonTransformer,
  Jwt,
  MdocDeviceResponse,
  RecordNotFoundError,
  W3cJsonLdVerifiablePresentation,
  W3cJwtVerifiablePresentation,
  X509Certificate,
  X509ModuleConfig,
  getJwkFromKey,
} from '@credo-ts/core'
import { OpenId4VcVerificationSessionState } from '@credo-ts/openid4vc'
import express, { type NextFunction, type Request, type Response } from 'express'
import z from 'zod'
import { agent } from './agent'
import { AGENT_HOST } from './constants'
import { getIssuerIdForCredentialConfigurationId } from './issuer'
import { issuers, issuersCredentialsData } from './issuers'
import { getX509Certificate } from './keyMethods'
import { oidcUrl } from './oidcProvider/provider'
import { getVerifier } from './verifier'
import { allDefinitions, verifiers } from './verifiers'

type CredentialConfigurationId = keyof typeof issuersCredentialsData

const zCreateOfferRequest = z.object({
  // FIXME: rename offeredCredentials to credentialSupportedIds in AFJ
  credentialSupportedIds: z.array(
    z.enum(Object.keys(issuersCredentialsData) as [CredentialConfigurationId, ...CredentialConfigurationId[]])
  ),
  issuerId: z.string(),
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
  const authorization = issuersCredentialsData[configurationId].authorization
  const issuerMetadata = await agent.modules.openId4VcIssuer.getIssuerMetadata(issuerId)

  const offer = await agent.modules.openId4VcIssuer.createCredentialOffer({
    issuerId,
    offeredCredentials: createOfferRequest.credentialSupportedIds,
    preAuthorizedCodeFlowConfig:
      authorization.type === 'pin' || authorization.type === 'none'
        ? {
            authorizationServerUrl: issuerMetadata.credentialIssuer.credential_issuer,
            txCode:
              authorization.type === 'pin'
                ? {
                    input_mode: 'numeric',
                    length: 4,
                  }
                : undefined,
          }
        : undefined,
    authorizationCodeFlowConfig:
      authorization.type === 'browser' || authorization.type === 'presentation'
        ? {
            requirePresentationDuringIssuance: authorization.type === 'presentation',
            authorizationServerUrl:
              authorization.type === 'browser' ? oidcUrl : issuerMetadata.credentialIssuer.credential_issuer,
          }
        : undefined,
  })

  return response.json(offer)
})

apiRouter.get('/x509', async (_, response: Response) => {
  const certificate = getX509Certificate()
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
      await agent.x509.addTrustedCertificate(base64)
    }

    return response.send(instance.toString('text'))
  } catch (error) {
    return response.status(500).json({
      errorMessage: 'error adding x509 certificate',
      error,
    })
  }
})

apiRouter.get('/issuer', async (_, response: Response) => {
  return response.json({
    credentialsSupported: issuers.flatMap((i) =>
      Object.entries(i.credentialConfigurationsSupported).map(([id, c]) => {
        const displayName =
          c.display?.[0]?.name ??
          (c.format === 'vc+sd-jwt' ? c.vct : c.format === 'mso_mdoc' ? c.doctype : 'Unregistered format')

        const data = issuersCredentialsData[id as keyof typeof issuersCredentialsData]
        const authorizationLabel =
          data.authorization.type === 'pin'
            ? 'Requires PIN'
            : data.authorization.type === 'browser'
              ? 'Requires Sign In'
              : data.authorization.type === 'presentation'
                ? 'Requires Presentation'
                : data.authorization.type === 'none'
                  ? 'No authorization'
                  : ''

        return {
          display: `${i.display[0].name} - ${displayName} (${c.format}) - ${authorizationLabel}`,
          id: c.id,
        }
      })
    ),
    availableX509Certificates: [AGENT_HOST],
  })
})

const zReceiveOfferRequest = z.object({
  credentialOfferUri: z.string().url(),
})

apiRouter.post('/offers/receive', async (request: Request, response: Response) => {
  const receiveOfferRequest = zReceiveOfferRequest.parse(request.body)

  const resolvedOffer = await agent.modules.openId4VcHolder.resolveCredentialOffer(
    receiveOfferRequest.credentialOfferUri
  )
  const token = await agent.modules.openId4VcHolder.requestToken({
    resolvedCredentialOffer: resolvedOffer,
  })
  const credentials = await agent.modules.openId4VcHolder.requestCredentials({
    resolvedCredentialOffer: resolvedOffer,
    accessToken: token.accessToken,
    cNonce: token.cNonce,
    credentialBindingResolver: async ({ keyTypes, supportsJwk }) => {
      if (supportsJwk) {
        const key = await agent.wallet.createKey({
          keyType: keyTypes[0],
        })

        return {
          method: 'jwk',
          jwk: getJwkFromKey(key),
        }
      }

      throw new Error('only jwk is supported for holder binding')
    },
  })

  for (const credential of credentials.credentials) {
    // authenticated channel issuance, not relevant here
    if (typeof credential === 'string') continue

    if ('compact' in credential.credentials[0]) {
      await agent.sdJwtVc.store(credential.credentials[0].compact as string)
    }
  }

  return response.json({
    credentials: credentials.credentials.map((credential) => {
      // if (credential instanceof Mdoc) {
      //   return credential.credential
      // }
      if (typeof credential.credentials[0] === 'string') return credential
      if ('payload' in credential.credentials[0]) {
        return credential.credentials[0].payload
      }
      throw new Error('Unsupported credential type')
    }),
  })
})

apiRouter.get('/verifier', async (_, response: Response) => {
  return response.json({
    presentationRequests: verifiers.flatMap((i) => [
      ...i.presentationRequests.map((c) => {
        return {
          display: `${i.clientMetadata.client_name} - ${c.name} - DIF PEX`,
          id: c.id,
        }
      }),
      ...i.dcqlRequests.map((c) => {
        return {
          display: `${i.clientMetadata.client_name} - ${c.name} - DCQL`,
          id: c.id,
        }
      }),
    ]),
  })
})

const zCreatePresentationRequestBody = z.object({
  presentationDefinitionId: z.string(),
  requestScheme: z.string(),
  responseMode: z.enum(['direct_post.jwt', 'direct_post']),
})

apiRouter.post('/requests/create', async (request: Request, response: Response) => {
  const createPresentationRequestBody = zCreatePresentationRequestBody.parse(request.body)

  const x509Certificate = getX509Certificate()

  const definitionId = createPresentationRequestBody.presentationDefinitionId
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
      requestSigner: {
        method: 'x5c',
        x5c: [x509Certificate],
        // FIXME: remove issuer param from credo as we can infer it from the url
        issuer: `${AGENT_HOST}/siop/${verifier.verifierId}/authorize`,
      },
      presentationExchange:
        'input_descriptors' in definition
          ? {
              definition,
            }
          : undefined,
      dcql:
        'credentials' in definition
          ? {
              query: definition,
            }
          : undefined,
      responseMode: createPresentationRequestBody.responseMode,
    })

  console.log(authorizationRequest)

  const authorizationRequestJwt = Jwt.fromSerializedJwt(verificationSession.authorizationRequestJwt)
  const dcqlQuery = authorizationRequestJwt.payload.additionalClaims.dcql_query
  const presentationDefinition = authorizationRequestJwt.payload.additionalClaims.presentation_definition

  return response.json({
    authorizationRequestUri: authorizationRequest.replace('openid4vp://', createPresentationRequestBody.requestScheme),
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
                    issuerSignedNamespaces: doc.issuerSignedNamespaces,
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
