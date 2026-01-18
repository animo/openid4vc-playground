import { URN_SCA_PAYMENT, zFunkeQesTransaction, zTs12PaymentTransaction } from '@animo-id/eudi-wallet-functionality'
import {
  JsonEncoder,
  JsonTransformer,
  Jwt,
  MdocDeviceResponse,
  RecordNotFoundError,
  TypedArrayEncoder,
  W3cJsonLdVerifiablePresentation,
  W3cJwtVerifiablePresentation,
  W3cV2JwtVerifiablePresentation,
  W3cV2SdJwtVerifiablePresentation,
  X509Certificate,
  X509ModuleConfig,
} from '@credo-ts/core'
import { type OpenId4VcVerificationSessionRecord, OpenId4VcVerificationSessionState } from '@credo-ts/openid4vc'
import { randomUUID } from 'crypto'
import express, { type NextFunction, type Request, type Response } from 'express'
import z from 'zod'
import { agent } from './agent.js'
import { funkeDeployedAccessCertificate, funkeDeployedRegistrationCertificate } from './eudiTrust.js'
import { getIssuerIdForCredentialConfigurationId, type IssuanceMetadata } from './issuer.js'
import { issuers } from './issuers/index.js'
import { getX509DcsCertificate, getX509RootCertificate } from './keyMethods/index.js'
import { oidcUrl } from './oidcProvider/provider.js'
import { addOneOfCredentials, findCredentials } from './utils/dcql.js'
import { LimitedSizeCollection } from './utils/LimitedSizeCollection.js'
import { getVerifier, type PlaygroundVerifierOptions } from './verifier.js'
import { verifiers } from './verifiers/index.js'
import { dcqlQueryFromRequest, pidMdocCredential, pidSdJwtCredential } from './verifiers/util.js'

const responseCodeMap = new LimitedSizeCollection<string>()

const zCreateOfferRequest = z.object({
  credentialSupportedIds: z.array(z.string()),
  authorization: z.enum(['pin', 'none', 'presentation', 'browser']).default('none'),
  requireDpop: z.boolean().default(false),
  requireWalletAttestation: z.boolean().default(false),
  requireKeyAttestation: z.boolean().default(false),
  deferBy: z.enum(['none', '1m', '1h', '1d']).optional().default('none'),
})

const zAddX509CertificateRequest = z.object({
  certificate: z.string(),
})
export const apiRouter = express.Router()

const deferIntervalMapping: Record<z.infer<typeof zCreateOfferRequest>['deferBy'], number | undefined> = {
  '1m': 60,
  '1h': 3600,
  '1d': 86400,
  none: undefined,
}

apiRouter.use(express.json())
apiRouter.use(express.text())
apiRouter.post('/offers/create', async (request: Request, response: Response) => {
  const createOfferRequest = zCreateOfferRequest.parse(request.body)

  // TODO: support multiple credential isuance
  const configurationId = createOfferRequest.requireKeyAttestation
    ? `${createOfferRequest.credentialSupportedIds[0]}-key-attestations`
    : createOfferRequest.credentialSupportedIds[0]

  const issuerId = getIssuerIdForCredentialConfigurationId(configurationId)
  const authorization = createOfferRequest.authorization
  const issuerMetadata = await agent.openid4vc.issuer.getIssuerMetadata(issuerId)

  // Parse deferment options
  const deferInterval = deferIntervalMapping[createOfferRequest.deferBy]

  const offer = await agent.openid4vc.issuer.createCredentialOffer({
    issuerId,
    credentialConfigurationIds: [configurationId],
    version: 'v1',
    authorization: {
      requireDpop: createOfferRequest.requireDpop,
      requireWalletAttestation: createOfferRequest.requireWalletAttestation,
    },
    generateRefreshTokens: !!createOfferRequest.deferBy,
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
    issuanceMetadata: {
      deferInterval,
    } satisfies IssuanceMetadata,
  })

  return response.json(offer)
})

apiRouter.get('/x509', async (_, response: Response) => {
  const certificate = getX509RootCertificate()
  return response.json({
    base64: certificate.toString('base64'),
    pem: certificate.toString('pem'),
    decoded: certificate.toString('text'),
  })
})

apiRouter.post('/x509', async (request: Request, response: Response) => {
  const addX509CertificateRequest = zAddX509CertificateRequest.parse(request.body)

  const trustedCertificates = agent.dependencyManager.resolve(X509ModuleConfig).trustedCertificates
  try {
    const instance = X509Certificate.fromEncodedCertificate(addX509CertificateRequest.certificate)
    const base64 = instance.toString('base64')

    if (!trustedCertificates?.includes(base64)) {
      agent.x509.config.addTrustedCertificate(base64)
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
        name: issuer.playgroundDisplayName ?? issuer.display[0].name,
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
    presentationRequests: verifiers.flatMap((verifier) =>
      verifier.requests.map((c, index) => ({
        useCase: 'useCase' in verifier ? verifier.useCase : undefined,
        display: c.name,
        id: `${verifier.verifierId}__${index}`,
      }))
    ),
  })
})

// apiRouter.post('/trust-chains', async (request: Request, response: Response) => {
//   const parseResult = await z
//     .object({
//       entityId: z.string(),
//       trustAnchorEntityIds: z.array(z.string()).nonempty(),
//     })
//     .safeParseAsync(request.body)

//   if (!parseResult.success) {
//     return response.status(400).json({
//       error: parseResult.error.message,
//       details: parseResult.error.issues,
//     })
//   }

//   const { entityId, trustAnchorEntityIds } = parseResult.data

//   const chains = await agent.openid4vc.holder.resolveOpenIdFederationChains({
//     entityId,
//     trustAnchorEntityIds,
//   })

//   return response.json(chains)
// })

const zCreatePresentationRequestBody = z.object({
  requestSignerType: z.enum(['none', 'x5c' /* 'openid-federation' */]),
  presentationDefinitionId: z.string(),
  requestScheme: z.string(),
  responseMode: z.enum(['direct_post.jwt', 'direct_post', 'dc_api', 'dc_api.jwt']),
  purpose: z.string().optional(),
  qesRequest: zFunkeQesTransaction
    .omit({
      credential_ids: true,
      type: true,
    })
    .optional(),
  paymentRequest: zTs12PaymentTransaction
    .omit({
      credential_ids: true,
      type: true,
    })
    .optional(),
  redirectUriBase: z.url().optional(),
})

const zReceiveDcResponseBody = z.object({
  verificationSessionId: z.string(),
  data: z.union([z.string(), z.record(z.string(), z.unknown())]),
})

apiRouter.post('/requests/create', async (request: Request, response: Response) => {
  try {
    const {
      requestSignerType,
      qesRequest,
      paymentRequest,
      presentationDefinitionId,
      requestScheme,
      responseMode,
      purpose,
      redirectUriBase,
    } = await zCreatePresentationRequestBody.parseAsync(request.body)

    const _x509RootCertificate = getX509RootCertificate()
    const x509DcsCertificate = getX509DcsCertificate()

    // Funke access certificate uses same key as the dcs certificate
    const funkeDcsAccessCertificate = X509Certificate.fromEncodedCertificate(funkeDeployedAccessCertificate)
    funkeDcsAccessCertificate.publicJwk.keyId = x509DcsCertificate.publicJwk.keyId

    const [verifierId, requestIndex] = presentationDefinitionId.split('__')
    const verifier = await getVerifier(verifierId)

    // biome-ignore lint/suspicious/noExplicitAny: no explanation
    const definition = (verifiers.find((v) => v.verifierId === verifierId)?.requests as any)[
      requestIndex
    ] as PlaygroundVerifierOptions['requests'][number]
    if (!definition) {
      return response.status(404).json({
        error: 'Definition not found',
      })
    }

    console.log('Requesting definition', JSON.stringify(definition, null, 2))
    const queryRequest = dcqlQueryFromRequest(definition, purpose)
    let pidCredentialIds = findCredentials(queryRequest.credentials, {
      vcts: [pidSdJwtCredential({ fields: [] }).vcts[0]],
      doctypes: [pidMdocCredential({ fields: [] }).doctype],
    }).map((query) => query.id)

    // create qes credentials if non is present
    if (qesRequest && !pidCredentialIds.length) {
      addOneOfCredentials(queryRequest, [
        {
          id: 'qes_pid_sd_jwt',
          format: 'dc+sd-jwt',
          meta: {
            vct_values: [pidSdJwtCredential({ fields: [] }).vcts[0]],
          },
          require_cryptographic_holder_binding: true,
        },
        {
          id: 'qes_pid_mdoc',
          format: 'mso_mdoc',
          meta: {
            doctype_value: pidMdocCredential({ fields: [] }).doctype,
          },
          require_cryptographic_holder_binding: true,
        },
      ])
      pidCredentialIds = ['qes_pid_sd_jwt', 'qes_pid_mdoc']
    }
    // create payment credential
    const scaId = 'sca_credential'
    if (paymentRequest) {
      addOneOfCredentials(queryRequest, [
        {
          id: scaId,
          format: 'dc+sd-jwt',
          meta: {},
          require_cryptographic_holder_binding: true,
        },
      ])
    }

    const definitionTransactionData = definition.transaction_data ?? []

    const responseCode = randomUUID()
    const redirectUri = redirectUriBase ? `${redirectUriBase}?response_code=${responseCode}` : undefined

    // Only include it in this one
    const isEudiAuthorization = presentationDefinitionId === '044721ed-af79-45ec-bab3-de85c3e722d0__1'
    const { authorizationRequest, verificationSession, authorizationRequestObject } =
      await agent.openid4vc.verifier.createAuthorizationRequest({
        authorizationResponseRedirectUri: redirectUri,
        verifierId: verifier.verifierId,
        verifierInfo: isEudiAuthorization
          ? [
              {
                format: 'jwt',
                data: funkeDeployedRegistrationCertificate,
              },
            ]
          : undefined,
        requestSigner:
          requestSignerType === 'none'
            ? { method: 'none' }
            : // Include the certificate from the german registrar
              isEudiAuthorization
              ? {
                  method: 'x5c',
                  x5c: [funkeDcsAccessCertificate],
                }
              : {
                  method: 'x5c',
                  x5c: [x509DcsCertificate],
                  clientIdPrefix: 'x509_hash',
                },
        transactionData: [
          ...definitionTransactionData,
          ...(qesRequest
            ? [
                {
                  ...qesRequest,
                  type: 'qes_authorization',
                  credential_ids: pidCredentialIds as [string, ...string[]],
                },
              ]
            : []),
          ...(paymentRequest
            ? [
                {
                  ...paymentRequest,
                  type: URN_SCA_PAYMENT,
                  credential_ids: [scaId] as [string, ...string[]],
                },
              ]
            : []),
        ],
        dcql: {
          query: queryRequest,
        },
        responseMode,
        version: 'v1',
        expectedOrigins:
          requestSignerType !== 'none' && responseMode.includes('dc_api')
            ? [request.headers.origin as string]
            : undefined,
      })

    if (redirectUri) {
      responseCodeMap.set(responseCode, verificationSession.id)
    }

    const authorizationRequestJwt = verificationSession.authorizationRequestJwt
      ? Jwt.fromSerializedJwt(verificationSession.authorizationRequestJwt)
      : undefined
    const authorizationRequestPayload = verificationSession.requestPayload
    const dcqlQuery = authorizationRequestPayload.dcql_query
    const transactionData = authorizationRequestPayload.verifier_info?.map((e) => ({
      ...e,
      data: typeof e.data === 'string' ? JsonEncoder.fromBase64(e.data) : e.data,
    }))

    console.log(JSON.stringify(authorizationRequestObject, null, 2))
    return response.json({
      authorizationRequestObject,
      authorizationRequestUri: authorizationRequest.replace('openid4vp://', requestScheme),
      verificationSessionId: verificationSession.id,
      responseStatus: verificationSession.state,
      dcqlQuery,
      transactionData,
      authorizationRequest: authorizationRequestJwt
        ? {
            payload: authorizationRequestJwt.payload.toJson(),
            header: authorizationRequestJwt.header,
          }
        : authorizationRequestPayload,
    })
  } catch (error) {
    return response.status(400).json({
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
})

async function getVerificationStatus(verificationSession: OpenId4VcVerificationSessionRecord) {
  const authorizationRequestJwt = verificationSession.authorizationRequestJwt
    ? Jwt.fromSerializedJwt(verificationSession.authorizationRequestJwt)
    : undefined
  const authorizationRequestPayload = verificationSession.requestPayload

  const authorizationRequest = {
    payload: verificationSession.requestPayload,
    header: authorizationRequestJwt?.header,
  }
  const dcqlQuery = authorizationRequestPayload.dcql_query

  const transactionData = authorizationRequestPayload.verifier_info?.map((e) => ({
    ...e,
    data: typeof e.data === 'string' ? JsonEncoder.fromBase64(e.data) : e.data,
  }))

  if (verificationSession.state === OpenId4VcVerificationSessionState.ResponseVerified) {
    const verified = await agent.openid4vc.verifier.getVerifiedAuthorizationResponse(verificationSession.id)
    console.log(verified.dcql?.presentationResult)

    const presentations = await Promise.all(
      Object.values(verified.dcql?.presentations ?? {})
        .flat()
        .map(async (presentation) => {
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

          if (
            presentation instanceof W3cV2JwtVerifiablePresentation ||
            presentation instanceof W3cV2SdJwtVerifiablePresentation
          ) {
            throw new Error('W3C V2 presentations are not supported yet')
          }

          return {
            pretty: {
              ...presentation,
              compact: undefined,
            },
            encoded: presentation.compact,
          }
        }) ?? []
    )

    const dcqlSubmission = verified.dcql
      ? Object.keys(verified.dcql.presentations).map((key, index) => ({
          queryCredentialId: key,
          presentationIndex: index,
        }))
      : undefined

    console.log('presentations', presentations)

    return {
      verificationSessionId: verificationSession.id,
      responseStatus: verificationSession.state,
      error: verificationSession.errorMessage,
      authorizationRequest,

      presentations: presentations,
      transactionDataSubmission: verified.transactionData,

      dcqlQuery,
      dcqlSubmission: verified.dcql
        ? { ...verified.dcql.presentationResult, vpTokenMapping: dcqlSubmission }
        : undefined,
    }
  }

  return {
    verificationSessionId: verificationSession.id,
    responseStatus: verificationSession.state,
    error: verificationSession.errorMessage,
    authorizationRequest,
    transactionData,
    dcqlQuery,
  }
}

apiRouter.post('/requests/verify-dc', async (request: Request, response: Response) => {
  const { verificationSessionId, data } = await zReceiveDcResponseBody.parseAsync(request.body)

  try {
    const { verificationSession } = await agent.openid4vc.verifier.verifyAuthorizationResponse({
      verificationSessionId,
      authorizationResponse: typeof data === 'string' ? JSON.parse(data) : data,
      origin: request.headers.origin,
    })

    return response.json(await getVerificationStatus(verificationSession))
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      return response.status(404).send('Verification session not found')
    }
    return response.status(500).send({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

apiRouter.get('/requests/:verificationSessionId', async (request, response) => {
  const verificationSessionId =
    responseCodeMap.get(request.params.verificationSessionId) ?? request.params.verificationSessionId

  try {
    const verificationSession = await agent.openid4vc.verifier.getVerificationSessionById(verificationSessionId)
    return response.json(await getVerificationStatus(verificationSession))
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      return response.status(404).send('Verification session not found')
    }
  }
})

apiRouter.get('/vct/:issuerId/:credential', async (request: Request, response: Response) => {
  console.log(request.url)
  const { issuerId, credential } = request.params

  const issuer = await agent.openid4vc.issuer.getIssuerByIssuerId(issuerId)
  if (!issuer) return response.status(404).send('VCT not found')
  const config = issuer.credentialConfigurationsSupported[credential]
  if (!config) return response.status(404).send('VCT not found')
  return response.json(config)
})

apiRouter.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  console.error('Unhandled error', error)
  return response.status(500).json({
    error: error.message,
  })
})
