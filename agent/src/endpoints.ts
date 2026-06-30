import {
  Hasher,
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
import {
  updatePaymentStatusForWeroCredential,
  weroScaConfiguration,
  weroScaThirdPartyConfiguration,
} from './issuers/openHorizonBank.js'
import { getX509DcsCertificate, getX509RootCertificate } from './keyMethods/index.js'
import { oidcUrl } from './oidcProvider/provider.js'
import { LimitedSizeCollection } from './utils/LimitedSizeCollection.js'
import { getVerifier, type PlaygroundVerifierOptions } from './verifier.js'
import { verifiers } from './verifiers/index.js'
import { dcqlQueryFromRequest } from './verifiers/util.js'

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

// Extracts paymentTransactionId (hash of the raw transaction_data entry, matching
// what the wallet computes per the transaction_data spec) and the amount from the
// authorization request JWT. Returns undefined if no transaction_data is present.
function extractPaymentTransactionData(
  authorizationRequestJwt: string | undefined
): { paymentTransactionId: string; amount: number } | undefined {
  if (!authorizationRequestJwt) return undefined

  const transactionData = Jwt.fromSerializedJwt(authorizationRequestJwt).payload.additionalClaims.transaction_data
  if (!Array.isArray(transactionData) || typeof transactionData[0] !== 'string') return undefined

  const rawEntry = transactionData[0]
  const paymentTransactionId = TypedArrayEncoder.toBase64Url(
    Hasher.hash(TypedArrayEncoder.fromBase64Url(rawEntry), 'sha-256')
  )
  const decoded = JSON.parse(Buffer.from(rawEntry, 'base64url').toString()) as { payload?: { amount?: string } }
  const amount = parseFloat(decoded.payload?.amount ?? '0')

  return { paymentTransactionId, amount }
}

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

apiRouter.post('/transaction-status', async (request: Request, response: Response) => {
  const authHeader = request.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined
  if (!token) {
    return response.sendStatus(401)
  }

  const parseResult = await z.object({ transaction: z.string() }).safeParseAsync(request.body)
  if (!parseResult.success) {
    agent.config.logger.warn('transaction-status: missing transactionId in request body')
    return response.sendStatus(401)
  }

  const { transaction } = parseResult.data
  agent.config.logger.info(`transaction-status: looking up record for transaction ${transaction}`)
  const record = await agent.genericRecords.findById(`transaction-status-${transaction}`)

  if (!record || record.content.transaction_status_token !== token || !('statusCode' in record.content)) {
    agent.config.logger.warn(
      `transaction-status: unauthorized - record ${record ? 'found but token mismatch or no statusCode' : 'not found'}`
    )
    return response.sendStatus(401)
  }

  agent.config.logger.info(
    `transaction-status: returning status ${record.content.statusCode} for transaction ${transaction}`
  )
  return response.json({
    status_code: record.content.statusCode,
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
  transactionAuthorizationType: z.enum(['none', 'qes', 'payment']),
  paymentAmount: z.string().optional(),
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
      transactionAuthorizationType,
      paymentAmount,
      presentationDefinitionId,
      requestScheme,
      responseMode,
      purpose,
      redirectUriBase,
    } = await zCreatePresentationRequestBody.parseAsync(request.body)

    const x509DcsCertificate = getX509DcsCertificate()

    // Funke access certificate uses same key as the dcs certificate
    const funkeDcsAccessCertificate = X509Certificate.fromEncodedCertificate(funkeDeployedAccessCertificate)
    funkeDcsAccessCertificate.publicJwk.keyId = x509DcsCertificate.publicJwk.keyId

    const [verifierId, requestIndex] = presentationDefinitionId.split('__')
    const verifier = await getVerifier(verifierId)

    // biome-ignore lint/suspicious/noExplicitAny: no explanation
    let definition = (verifiers.find((v) => v.verifierId === verifierId)?.requests as any)[
      requestIndex
    ] as PlaygroundVerifierOptions['requests'][number]
    if (!definition) {
      return response.status(404).json({
        error: 'Definition not found',
      })
    }

    if (transactionAuthorizationType === 'payment') {
      definition = {
        ...definition,
        credentials: [
          ...definition.credentials,
          {
            format: 'dc+sd-jwt',
            vcts: ['eu.europa.wero.card'],
            fields: ['iban', 'bic', 'payment_network', 'currency'],
          },
        ],
      }
    }

    agent.config.logger.debug(`Requesting definition ${JSON.stringify(definition, null, 2)}`)

    const queryLanguageDefinition = dcqlQueryFromRequest(definition, purpose)
    const credentialIds = queryLanguageDefinition.credentials.map((query) => query.id)

    const responseCode = randomUUID()
    const redirectUri = redirectUriBase ? `${redirectUriBase}?response_code=${responseCode}` : undefined
    const paymentTransactionEntry =
      transactionAuthorizationType === 'payment'
        ? {
            type: 'urn:eudi:sca:eu.europa.ec:payment:single:1',
            credential_ids: [credentialIds[credentialIds.length - 1]] as [string, ...string[]],
            transaction_data_hashes_alg: ['sha-256'] as [string, ...string[]],
            payload: {
              transaction_id: randomUUID(),
              amount: `${paymentAmount} EUR`,
              date_time: new Date().toISOString(),
              payee: {
                name: verifier.clientMetadata?.client_name ?? 'TODO: NAME',
                id: verifierId,
                logo: verifier.clientMetadata?.logo_uri ?? 'TODO: logo',
                website: 'https://playground.animo.id',
              },
            },
          }
        : undefined

    // When credential_sets is used we need to add the wero card to each group so that it will always be requested when also requesting a payment.
    // If the request did not define credential_sets originally, the default set generated by dcqlQueryFromRequest already includes all credentials (including the appended wero card), so we must not push again.
    if (transactionAuthorizationType === 'payment' && definition.credential_sets) {
      queryLanguageDefinition.credential_sets?.forEach((cs) => {
        cs.options.map((opts) => opts.push(credentialIds[credentialIds.length - 1]))
      })
    }

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
        transactionData:
          transactionAuthorizationType === 'qes'
            ? [
                {
                  credential_ids: credentialIds as [string, ...string[]],
                  type: 'qes_authorization',
                  transaction_data_hashes_alg: ['sha-256'],
                  signatureQualifier: 'eu_eidas_qes',
                  documentDigests: [
                    {
                      hash: 'some-hash',
                      label: 'Declaration of Independence.pdf',
                      hashAlgorithmOID: 'something',
                    },
                  ],
                },
              ]
            : transactionAuthorizationType === 'payment' && paymentTransactionEntry
              ? [paymentTransactionEntry]
              : undefined,
        dcql: {
          query: queryLanguageDefinition,
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

    const paymentTransaction = extractPaymentTransactionData(verificationSession.authorizationRequestJwt)
    if (transactionAuthorizationType === 'payment' && paymentTransaction) {
      agent.config.logger.info(
        `requests/create: saving PDNG payment record for paymentTransactionId ${paymentTransaction.paymentTransactionId}`
      )
      await agent.genericRecords.save({
        id: `transaction-status-${paymentTransaction.paymentTransactionId}`,
        content: { statusCode: 'PDNG' },
      })
    }

    const authorizationRequestJwt = verificationSession.authorizationRequestJwt
      ? Jwt.fromSerializedJwt(verificationSession.authorizationRequestJwt)
      : undefined
    const authorizationRequestPayload = verificationSession.requestPayload
    const dcqlQuery = authorizationRequestPayload.dcql_query

    agent.config.logger.debug(JSON.stringify(authorizationRequestObject, null, 2))
    return response.json({
      authorizationRequestObject,
      authorizationRequestUri: authorizationRequest.replace('openid4vp://', requestScheme),
      verificationSessionId: verificationSession.id,
      responseStatus: verificationSession.state,
      dcqlQuery,
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

  if (verificationSession.state === OpenId4VcVerificationSessionState.ResponseVerified) {
    const verified = await agent.openid4vc.verifier.getVerifiedAuthorizationResponse(verificationSession.id)
    agent.config.logger.debug(JSON.stringify(verified.dcql?.presentationResult))

    // Find the Wero SCA presentation to extract the credential jti, then signal the issuer to update payment status.
    // The issuer owns the transaction_status_token — the verifier only passes the jti and payment details.
    const weroVcts: string[] = [weroScaConfiguration.vct, weroScaThirdPartyConfiguration.vct]
    const presentationsList = Object.values(verified.dcql?.presentations ?? {}).flat() as Array<{
      prettyClaims?: { vct?: string; jti?: string }
    }>
    const weroJti = presentationsList.find((p) => weroVcts.includes(p.prettyClaims?.vct ?? ''))?.prettyClaims?.jti

    const paymentTransaction = extractPaymentTransactionData(verificationSession.authorizationRequestJwt)
    if (weroJti && paymentTransaction) {
      const { paymentTransactionId, amount } = paymentTransaction
      agent.config.logger.info(
        `getVerificationStatus: Wero credential jti ${weroJti}, paymentTransactionId ${paymentTransactionId}, amount ${amount}`
      )
      await updatePaymentStatusForWeroCredential(weroJti, paymentTransactionId, amount).catch((error) => {
        agent.config.logger.error(`getVerificationStatus: payment update failed for ${paymentTransactionId}`, error)
      })
    } else {
      agent.config.logger.debug(
        `getVerificationStatus: no payment update - weroJti ${weroJti ?? 'not found'}, paymentTransaction ${paymentTransaction ? 'found' : 'not found'}`
      )
    }

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
                documents: (presentation.deviceResponse.documents ?? []).map((doc) => {
                  const docType = doc.docType
                  const issuerSignedNamespaces = presentation.issuerClaims[docType] ?? {}
                  const deviceSignedNamespaces = presentation.deviceClaims[docType] ?? {}

                  return {
                    doctype: docType,
                    alg: doc.issuerSigned.issuerAuth.algorithm,
                    validityInfo: doc.issuerSigned.issuerAuth.mobileSecurityObject.validityInfo,
                    deviceSignedNamespaces,
                    issuerSignedNamespaces: Object.entries(issuerSignedNamespaces).map(
                      ([nameSpace, nameSpacEntries]) => [
                        nameSpace,
                        Object.entries(nameSpacEntries as Record<string, unknown>).map(([key, value]) =>
                          value instanceof Uint8Array
                            ? [`base64:${key}`, `data:image/jpeg;base64,${TypedArrayEncoder.toBase64(value)}`]
                            : [key, value]
                        ),
                      ]
                    ),
                  }
                }),
              }),
              encoded: presentation.encoded,
            }
          }

          if (
            presentation instanceof W3cV2JwtVerifiablePresentation ||
            presentation instanceof W3cV2SdJwtVerifiablePresentation
          ) {
            const verifiableCredentials = Array.isArray(presentation.resolvedPresentation.verifiableCredential)
              ? presentation.resolvedPresentation.verifiableCredential
              : [presentation.resolvedPresentation.verifiableCredential]

            return {
              pretty: JsonTransformer.toJSON({
                '@context': presentation.resolvedPresentation.context,
                id: presentation.resolvedPresentation.id,
                type: presentation.resolvedPresentation.type,
                holder: presentation.resolvedPresentation.holder,

                verifiableCredential: verifiableCredentials.map((vc) => vc.resolvedCredential.toJSON()),
              }),
              encoded: presentation.encoded,
            }
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

    agent.config.logger.debug(`presentations ${JSON.stringify(presentations)}`)

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

apiRouter.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  agent.config.logger.error(`Unhandled error ${error}`)
  return response.status(500).json({
    error: error.message,
  })
})
