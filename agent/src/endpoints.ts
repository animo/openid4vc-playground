import {
  Hasher,
  JsonTransformer,
  Jwt,
  MdocDeviceRequestNotSatisfiedError,
  MdocDeviceResponse,
  RecordNotFoundError,
  TypedArrayEncoder,
  W3cJsonLdVerifiablePresentation,
  W3cJwtVerifiablePresentation,
  W3cV2DataIntegrityVerifiablePresentation,
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
import { AGENT_HOST } from './constants.js'
import { getIssuerIdForCredentialConfigurationId, type IssuanceMetadata } from './issuer.js'
import { issuers } from './issuers/index.js'
import {
  updatePaymentStatusForWeroCredential,
  weroPasoConfiguration,
  weroScaConfiguration,
  weroScaThirdPartyConfiguration,
} from './issuers/openHorizonBank.js'
import { getX509DcsCertificate, getX509RootCertificate } from './keyMethods/index.js'
import { oidcUrl } from './oidcProvider/provider.js'
import { getPasoCredentialMetadataDocument, getPasoCredentialMetadataJwt } from './paso/credentialMetadata.js'
import { pasoSupportedLocales, resolvePasoServedLocales } from './paso/metadata.js'
import { createPasoPaymentTransactionDataEntry } from './paso/request.js'
import { getPasoTransactionDataEntry, type PasoVerificationResult, verifyPasoProofPackage } from './paso/verify.js'
import { formatErrorChain, getErrorChain } from './utils/error.js'
import { LimitedSizeCollection } from './utils/LimitedSizeCollection.js'
import { getVerifier } from './verifier.js'
import { presentationCredentials } from './verifiers/credentials.js'
import {
  dcqlQueryFromRequest,
  isoMdocDocRequestsFromRequest,
  type PresentationRequest,
  presentationRequestFromSelection,
  withPaymentCredential,
} from './verifiers/util.js'
import { utopiaGovernmentVerifier } from './verifiers/utopiaGovernment.js'

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
    credentials: presentationCredentials.map((credential) => ({
      id: credential.id,
      display: credential.display,
      formats: Object.keys(credential.formats),
      attributes: credential.attributes.map((attribute) => ({
        id: attribute.id,
        name: attribute.name,
        required: attribute.required,
        formats: [
          ...(attribute.sdJwt && credential.formats['dc+sd-jwt'] ? ['dc+sd-jwt'] : []),
          ...(attribute.mdoc && credential.formats.mso_mdoc ? ['mso_mdoc'] : []),
        ],
      })),
      presets: credential.presets,
    })),
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

const zPresentationCredentialSelection = z.object({
  credentials: z
    .array(
      z.object({
        id: z.string(),
        formats: z.array(z.enum(['dc+sd-jwt', 'mso_mdoc'])).min(1),
        attributes: z.array(z.string()).min(1),
      })
    )
    .min(1),
  combination: z.enum(['all', 'any']),
})

const zCreatePresentationRequestBody = z.object({
  requestSignerType: z.enum(['none', 'x5c' /* 'openid-federation' */]),
  request: zPresentationCredentialSelection,
  requestScheme: z.string(),
  responseMode: z.enum(['direct_post.jwt', 'direct_post', 'dc_api', 'dc_api.jwt']),
  purpose: z.string().optional(),
  transactionAuthorizationType: z.enum(['none', 'qes', 'payment', 'paso-payment']),
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
      request: credentialSelection,
      requestScheme,
      responseMode,
      purpose,
      redirectUriBase,
    } = await zCreatePresentationRequestBody.parseAsync(request.body)

    const x509DcsCertificate = getX509DcsCertificate()
    const verifier = await getVerifier(utopiaGovernmentVerifier.verifierId)

    let definition: PresentationRequest = presentationRequestFromSelection(credentialSelection)

    // A payment is authorized with the Wero card, so it is always required — but it is also
    // selectable in its own right, so the request may already ask for it. PaSO uses its own
    // credential type: its metadata declares the PaSO transaction data types, and [PaSO Core]
    // Section 7.3 requires the entry to target exactly one credential query.
    let paymentCredentialIndex: number | undefined
    if (transactionAuthorizationType === 'payment' || transactionAuthorizationType === 'paso-payment') {
      const withPayment = withPaymentCredential(definition, {
        format: 'dc+sd-jwt',
        vcts: [transactionAuthorizationType === 'paso-payment' ? weroPasoConfiguration.vct : 'eu.europa.wero.card'],
        fields: ['iban', 'bic', 'payment_network', 'currency'],
      })

      if ('error' in withPayment) {
        return response.status(400).json({ message: withPayment.error })
      }

      definition = withPayment.request
      paymentCredentialIndex = withPayment.credentialIndex
    }

    // [PaSO Core] Section 3: "The Wallet SHALL reject unsigned PaSO presentation requests." Sending
    // one would only produce a request every conforming wallet refuses, so refuse it here instead.
    if (transactionAuthorizationType === 'paso-payment' && requestSignerType === 'none') {
      return response
        .status(400)
        .json({ message: 'PaSO payment requests must be signed. Choose the x5c request signer.' })
    }

    // The Basic Payments rulebook makes `amount` mandatory, and [PaSO View] Section 3 fixes its
    // shape. Without a value the entry would carry the string "undefined EUR", which a conforming
    // wallet refuses with a payload error that says nothing about the empty form field behind it.
    if (transactionAuthorizationType === 'paso-payment' && !paymentAmount?.trim()) {
      return response.status(400).json({ message: 'A PaSO payment request needs a payment amount.' })
    }

    agent.config.logger.debug(`Requesting definition ${JSON.stringify(definition, null, 2)}`)

    const queryLanguageDefinition = dcqlQueryFromRequest(definition, purpose)
    const credentialIds = queryLanguageDefinition.credentials.map((query) => query.id)

    const responseCode = randomUUID()
    const redirectUri = redirectUriBase ? `${redirectUriBase}?response_code=${responseCode}` : undefined
    const pasoTransactionEntry =
      transactionAuthorizationType === 'paso-payment' && paymentCredentialIndex !== undefined
        ? await createPasoPaymentTransactionDataEntry({
            credentialQueryId: credentialIds[paymentCredentialIndex],
            amount: `${paymentAmount} EUR`,
            payeeName: verifier.clientMetadata?.client_name ?? 'Utopia Government',
            // The rulebook changed this from a payment-network identifier to the Payee's national tax
            // identifier or business registry number, which the Authorizing Party verifies against the
            // registry. A made-up but well-formed Dutch RSIN stands in for one here.
            payeeId: 'NL857098159B01',
            // Not the verifier's `logo_uri`: that asset is a 1024px, 1.8 MB avatar, and
            // [PaSO View] Section 3 caps a payee logo at 512 KiB. A logo rendered at ~60px on a
            // consent screen has no use for more, and the oversized one makes the entry
            // incompatible in every conforming wallet.
            payeeLogoUrl: `${AGENT_HOST}/assets/verifiers/government-payee.png`,
          })
        : undefined

    const paymentTransactionEntry =
      transactionAuthorizationType === 'payment' && paymentCredentialIndex !== undefined
        ? {
            type: 'urn:eudi:sca:eu.europa.ec:payment:single:1',
            credential_ids: [credentialIds[paymentCredentialIndex]] as [string, ...string[]],
            transaction_data_hashes_alg: ['sha-256'] as [string, ...string[]],
            payload: {
              transaction_id: randomUUID(),
              amount: `${paymentAmount} EUR`,
              date_time: new Date().toISOString(),
              payee: {
                name: verifier.clientMetadata?.client_name ?? 'TODO: NAME',
                id: verifier.verifierId,
                logo: verifier.clientMetadata?.logo_uri ?? 'TODO: logo',
                website: 'https://eudi-payments.animo.id',
              },
            },
          }
        : undefined

    const { authorizationRequest, verificationSession, authorizationRequestObject } =
      await agent.openid4vc.verifier.createAuthorizationRequest({
        authorizationResponseRedirectUri: redirectUri,
        verifierId: verifier.verifierId,
        requestSigner:
          requestSignerType === 'none'
            ? { method: 'none' }
            : {
                method: 'x5c',
                x5c: [x509DcsCertificate],
                clientIdPrefix: 'x509_hash',
              },
        transactionData:
          transactionAuthorizationType === 'paso-payment'
            ? [pasoTransactionEntry as NonNullable<typeof pasoTransactionEntry>]
            : transactionAuthorizationType === 'qes'
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

function mdocDocumentsToJson(deviceResponse: MdocDeviceResponse) {
  return (deviceResponse.deviceResponse.documents ?? []).map((doc) => {
    const docType = doc.docType
    const issuerSignedNamespaces = deviceResponse.issuerClaims[docType] ?? {}
    const deviceSignedNamespaces = deviceResponse.deviceClaims[docType] ?? {}

    return {
      doctype: docType,
      alg: doc.issuerSigned.issuerAuth.algorithm,
      validityInfo: doc.issuerSigned.issuerAuth.mobileSecurityObject.validityInfo,
      deviceSignedNamespaces,
      issuerSignedNamespaces: Object.entries(issuerSignedNamespaces).map(([nameSpace, nameSpacEntries]) => [
        nameSpace,
        Object.entries(nameSpacEntries as Record<string, unknown>).map(([key, value]) =>
          value instanceof Uint8Array
            ? [`base64:${key}`, `data:image/jpeg;base64,${TypedArrayEncoder.toBase64(value)}`]
            : [key, value]
        ),
      ]),
    }
  })
}

/**
 * Makes mdoc values JSON serializable. Byte strings (such as a portrait) would otherwise serialize as
 * an object with an entry per byte, and maps as an empty object.
 */
function mdocValueToJson(value: unknown): unknown {
  if (value instanceof Uint8Array) return TypedArrayEncoder.toBase64(value)
  if (value instanceof Map) {
    return Object.fromEntries(Array.from(value, ([key, entry]) => [String(key), mdocValueToJson(entry)]))
  }
  if (Array.isArray(value)) return value.map(mdocValueToJson)
  if (value && typeof value === 'object' && !('toJSON' in value && typeof value.toJSON === 'function')) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, mdocValueToJson(entry)]))
  }

  return value
}

/**
 * A readable stand-in for the `issuer` of an [SD-JWT-VC] presentation.
 *
 * Credo hands back parsed `X509Certificate` instances, and `JSON.stringify` walks their whole ASN.1
 * tree: a few hundred lines of byte-indexed objects per certificate, which buries everything else in
 * the verification output. The certificate's own text encoding says the same thing in a form someone
 * can read, and is what the `/x509` endpoint already serves.
 *
 * Only the `x5c` form needs this. A `did` issuer is a string already.
 */
function sdJwtVcIssuerToJson(issuer: unknown): unknown {
  if (!issuer || typeof issuer !== 'object' || !('method' in issuer) || issuer.method !== 'x5c') return issuer

  const { x5c, ...rest } = issuer as { method: 'x5c'; x5c: X509Certificate[]; issuer?: string }
  return { ...rest, x5c: x5c.map((certificate) => certificate.toString('text')) }
}

/**
 * Runs the PaSO verification once per verification session and remembers the outcome.
 *
 * `getVerificationStatus` is a polling endpoint, and [PaSO Proof Verify] Section 3 step 4 has the
 * Authorizing Party keep a `jti` replay cache. Verifying on every poll would put the transaction's
 * own `jti` in that cache on the first call and then report every later poll as a replay.
 */
const pasoVerifications = new LimitedSizeCollection<PasoVerificationResult>()

async function getOrRunPasoVerification(
  verificationSessionId: string,
  run: () => Promise<PasoVerificationResult>
): Promise<PasoVerificationResult> {
  const cached = pasoVerifications.get(verificationSessionId)
  if (cached) return cached

  const result = await run()
  pasoVerifications.set(verificationSessionId, result)
  return result
}

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
                documents: mdocDocumentsToJson(presentation),
              }),
              encoded: presentation.encoded,
            }
          }

          if (
            presentation instanceof W3cV2JwtVerifiablePresentation ||
            presentation instanceof W3cV2SdJwtVerifiablePresentation
          ) {
            const verifiableCredentials = [presentation.resolvedPresentation.verifiableCredential ?? []].flat()

            return {
              pretty: JsonTransformer.toJSON({
                '@context': presentation.resolvedPresentation.context,
                id: presentation.resolvedPresentation.id,
                type: presentation.resolvedPresentation.type,
                holder: presentation.resolvedPresentation.holder,

                verifiableCredential: verifiableCredentials.map((vc) =>
                  'resolvedCredential' in vc ? vc.resolvedCredential.toJSON() : vc
                ),
              }),
              encoded: presentation.encoded,
            }
          }

          if (presentation instanceof W3cV2DataIntegrityVerifiablePresentation) {
            return {
              pretty: presentation.securedPresentation,
              encoded: presentation.encoded,
            }
          }

          return {
            pretty: {
              ...presentation,
              issuer: sdJwtVcIssuerToJson(presentation.issuer),
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

    // The Authorizing Party half of the flow. The playground is a first-party deployment
    // ([PaSO Core] Section 3), so the same process that signed the request also verifies the proof
    // package against it — no forwarding needed. `/api/paso/transactions` below is the same check
    // exposed for a third-party Relying Party to POST to.
    const signedRequest = verificationSession.authorizationRequestJwt
    const pasoVerification =
      signedRequest && getPasoTransactionDataEntry(signedRequest)
        ? await getOrRunPasoVerification(verificationSession.id, () =>
            verifyPasoProofPackage({
              signedRequest,
              vpToken: Object.fromEntries(
                Object.entries(verified.dcql?.presentations ?? {}).map(([queryId, entries]) => [
                  queryId,
                  [entries].flat().map((entry) => (entry as { compact?: string }).compact ?? ''),
                ])
              ),
            }).catch((error) => ({
              accepted: false,
              checks: [
                { check: 'paso', passed: false, detail: error instanceof Error ? error.message : 'Unknown error' },
              ],
            }))
          )
        : undefined

    agent.config.logger.debug(`presentations ${JSON.stringify(presentations)}`)

    return {
      verificationSessionId: verificationSession.id,
      responseStatus: verificationSession.state,
      error: verificationSession.errorMessage,
      authorizationRequest,

      presentations: presentations,
      transactionDataSubmission: verified.transactionData,
      pasoVerification,

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

/**
 * The PaSO signed credential metadata endpoint, per [PaSO Proof Metadata] Section 2.
 *
 * `Accept-Language` is a **SHALL** on the wallet and the provider decides which locales the JWT
 * covers, so a request without it is answered 400 as Section 2 allows. The JWT itself has to be
 * stable enough that the Authorizing Party can check `metadata_integrity` against it — see
 * `paso/credentialMetadata.ts`.
 *
 * It lives on the `/api` router, unlike the TS 12 endpoint in `server.ts`, because `/api` is what the
 * deployment routes to this agent. At the root the reverse proxy hands the path to the frontend
 * instead, and a wallet fetching the `credential_metadata_uri` of a PaSO Credential gets the app's
 * HTML — which it can only read as "this is not a PaSO Credential".
 */
apiRouter.use('/paso-credential-metadata', async (request: Request, response: Response) => {
  const acceptLanguage = request.headers['accept-language']
  if (!acceptLanguage) {
    return response.status(400).json({ error: 'Accept-Language header is required' })
  }

  const servedLocales = resolvePasoServedLocales(acceptLanguage)
  if (servedLocales.length === 0) {
    return response
      .status(400)
      .json({ error: `None of the requested locales is supported. Supported: ${pasoSupportedLocales.join(', ')}` })
  }

  // Section 2: "If the `Accept` header is absent or does not express a preference, the Attestation
  // Provider SHALL default to `application/json`." Listing both types with JSON first is what makes
  // that hold — `request.accepts('application/jwt')` alone is true for a bare `*/*`, which is
  // precisely the no-preference case, and would serve the signed form to a client that never asked
  // for it.
  if (request.accepts(['application/json', 'application/jwt']) === 'application/jwt') {
    return response.contentType('application/jwt').send(await getPasoCredentialMetadataJwt(servedLocales))
  }

  // The unsigned form, for inspection only — a wallet may not rely on it for a PaSO Credential, and
  // [PaSO Risk Signals] Section 7.3 says the same of the encryption key it carries: not
  // integrity-verified, so treated as absent.
  return response.json(getPasoCredentialMetadataDocument(servedLocales))
})

/**
 * The Transaction Ingestion Endpoint of [PaSO Proof Verify] Section 4.
 *
 * Optional in the spec ("The Authorizing Party MAY expose an HTTP endpoint"), and the way a
 * third-party Relying Party hands a proof package to an Authorizing Party that did not create the
 * request. The status codes are the ones Section 4.2 fixes: 200 accepted, 400 malformed or failed
 * check, 409 replayed `jti`.
 *
 * Not implemented: the JWE form of Section 4.3. The endpoint accepts `application/json` only, so a
 * Relying Party forwarding over an untrusted path gets no confidentiality — which is exactly why
 * Section 4.3 makes encryption a SHOULD.
 */
apiRouter.post('/paso/transactions', async (request: Request, response: Response) => {
  const parseResult = await z
    .object({ signed_request: z.string(), vp_token: z.union([z.string(), z.record(z.string(), z.unknown())]) })
    .safeParseAsync(typeof request.body === 'string' ? JSON.parse(request.body) : request.body)

  if (!parseResult.success) {
    return response.status(400).json({ error: 'The proof package is malformed', details: parseResult.error.issues })
  }

  try {
    const result = await verifyPasoProofPackage({
      signedRequest: parseResult.data.signed_request,
      vpToken: parseResult.data.vp_token as Record<string, string[] | string>,
    })

    if (result.accepted) return response.json({ status: 'accepted', checks: result.checks })

    const replayed = result.checks.some((check) => check.check === 'jti_uniqueness' && !check.passed)
    return response.status(replayed ? 409 : 400).json({
      error: replayed ? 'The jti has already been processed' : 'A verification check failed',
      checks: result.checks,
    })
  } catch (error) {
    return response.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' })
  }
})

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

const zCreateIsoMdocRequestBody = z.object({
  request: zPresentationCredentialSelection,
  useReaderAuth: z.boolean().default(false),
})

const zVerifyIsoMdocResponseBody = z.object({
  verificationSessionId: z.string(),
  response: z.object({ response: z.string() }),
})

apiRouter.post('/iso-mdoc/requests/create', async (request: Request, response: Response) => {
  try {
    const { request: credentialSelection, useReaderAuth } = await zCreateIsoMdocRequestBody.parseAsync(request.body)

    const isoMdocRequest = isoMdocDocRequestsFromRequest(presentationRequestFromSelection(credentialSelection))
    if (!isoMdocRequest) {
      return response.status(400).json({
        message: 'Request can not be expressed as an ISO 18013-7 DeviceRequest',
      })
    }

    // The origin the browser will hand to the wallet, and the only origin a response can decrypt for.
    const origin = request.headers.origin
    if (!origin) {
      return response.status(400).json({
        message: 'Missing origin header',
      })
    }

    const { verificationSession, request: dcApiRequest } = await agent.mdoc.createDcApiVerificationSession({
      docRequests: isoMdocRequest.docRequests,
      // Nothing in the DeviceRequest marks the doc requests as alternatives, this only changes how the
      // response is matched. The wallet has to apply the same interpretation.
      treatAmbiguousMultipleDocRequestsAsAlternatives: isoMdocRequest.docRequestsAsAlternatives,
      // Reader authentication signs over the session transcript, which binds this single origin.
      readerAuth: useReaderAuth ? { certificate: getX509DcsCertificate(), origin } : undefined,
    })

    return response.json({
      verificationSessionId: verificationSession.id,
      responseStatus: verificationSession.state,
      request: dcApiRequest,
      docRequests: isoMdocRequest.docRequests,
      docRequestsAsAlternatives: isoMdocRequest.docRequestsAsAlternatives,
    })
  } catch (error) {
    return response.status(400).json({
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
})

apiRouter.post('/iso-mdoc/requests/verify', async (request: Request, response: Response) => {
  const { verificationSessionId, response: isoMdocResponse } = await zVerifyIsoMdocResponseBody.parseAsync(request.body)
  const origin = request.headers.origin
  const encryptedResponse = typeof isoMdocResponse === 'string' ? isoMdocResponse : isoMdocResponse.response

  agent.config.logger.info(`iso-mdoc/verify: verifying response for verification session ${verificationSessionId}`, {
    origin,
    responseLength: encryptedResponse.length,
  })
  // Logged separately so the (encrypted) response can be replayed when debugging a failure
  agent.config.logger.debug(`iso-mdoc/verify: encrypted response ${encryptedResponse}`)

  if (!origin) {
    return response.status(400).json({
      message: 'Missing origin header',
    })
  }

  try {
    const {
      verificationSession,
      deviceResponse,
      deviceRequestMatch,
      origin: verifiedOrigin,
    } = await agent.mdoc.verifyDcApiResponse({
      verificationSessionId,
      response: isoMdocResponse,
      origin,
    })

    agent.config.logger.info(`iso-mdoc/verify: verified response for verification session ${verificationSessionId}`, {
      verifiedOrigin,
      docTypes: deviceResponse.deviceResponse.documents?.map((document) => document.docType),
    })

    return response.json({
      verificationSessionId: verificationSession.id,
      responseStatus: verificationSession.state,
      origin: verifiedOrigin,
      deviceResponse: JsonTransformer.toJSON({ documents: mdocDocumentsToJson(deviceResponse) }),
      deviceRequestMatch: mdocValueToJson(deviceRequestMatch),
    })
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      agent.config.logger.warn(`iso-mdoc/verify: verification session ${verificationSessionId} not found`)
      return response.status(404).send('Verification session not found')
    }

    const errorChain = getErrorChain(error)

    // The verification session is updated to `Error` before the error is rethrown, so it's still
    // available here and tells us which origins/state the response was verified against.
    const verificationSession = await agent.mdoc
      .getVerificationSessionById(verificationSessionId)
      .catch(() => undefined)

    const trustedCertificates = (agent.dependencyManager.resolve(X509ModuleConfig).trustedCertificates ?? []).map(
      (certificate) => {
        try {
          const parsed = X509Certificate.fromEncodedCertificate(certificate)
          return `${parsed.subject} (issuer: ${parsed.issuer})`
        } catch {
          return 'unable to parse trusted certificate'
        }
      }
    )

    agent.config.logger.error(
      `iso-mdoc/verify: verification failed for verification session ${verificationSessionId}. ${formatErrorChain(
        error
      )}`,
      {
        requestOrigin: origin,
        verificationSessionState: verificationSession?.state,
        verificationSessionExpiresAt: verificationSession?.expiresAt,
        verificationSessionIsExpired: verificationSession?.isExpired,
        deviceRequest: verificationSession?.deviceRequestBase64Url,
        deviceRequestDefinition: verificationSession?.deviceRequestDefinition,
        deviceRequestMatch:
          error instanceof MdocDeviceRequestNotSatisfiedError ? mdocValueToJson(error.deviceRequestMatch) : undefined,
        sessionTranscript: verificationSession?.sessionTranscript,
        trustedCertificates,
        errorChain,
      }
    )

    return response.status(500).send({
      error: formatErrorChain(error),
      errorChain: errorChain.map(({ name, message }) => `${name}: ${message}`),
      deviceRequestMatch:
        error instanceof MdocDeviceRequestNotSatisfiedError ? mdocValueToJson(error.deviceRequestMatch) : undefined,
    })
  }
})

apiRouter.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  agent.config.logger.error(`Unhandled error. ${formatErrorChain(error)}`, { errorChain: getErrorChain(error) })
  return response.status(500).json({
    error: error.message,
  })
})
