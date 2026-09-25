import { Hasher, JwsService, Jwt, TypedArrayEncoder, X509Certificate, X509Service } from '@credo-ts/core'
import { agent } from '../agent.js'
import { getX509RootCertificate } from '../keyMethods/index.js'
import { getIssuedPasoMetadataIntegrityValues, getPasoTransactionDataTypeMetadata } from './credentialMetadata.js'
import { computeSriIntegrity, lookupLanguageTag } from './metadata.js'
import { pasoPaymentTransactionDataType, validatePasoPaymentPayload } from './paymentRulebook.js'
import { resolveEffectiveRiskSignalSet } from './riskSignals.js'
import { decryptPasoRiskSignals } from './riskSignalsEncryption.js'

/**
 * The Authorizing Party side of PaSO, per [PaSO Proof Verify].
 *
 * https://aptitude-consortium.github.io/payments-and-sca-for-openid/draft-2/specifications/proof/paso-proof-verify/
 *
 * The playground is a first-party flow — the same deployment is Attestation Provider, Relying Party
 * and Authorizing Party ([PaSO Core] Section 3) — so this runs against its own issued metadata and
 * its own replay cache. Every check reports itself rather than throwing, because the point of a
 * playground is to show *which* check would have rejected a transaction.
 *
 * Section 3 closes with "If any check fails, the Authorizing Party SHALL reject the transaction",
 * which is what `accepted` means below.
 */

export interface PasoVerificationCheck {
  check: string
  passed: boolean
  detail: string
}

export interface PasoVerificationResult {
  accepted: boolean
  checks: PasoVerificationCheck[]
  /**
   * The plaintext `risk_signals` array, when it arrived encrypted and this deployment could decrypt.
   *
   * Reported separately from the checks because it is the one part of the proof package that is not
   * visible in the presentation itself: the KB-JWT carries a JWE compact string, and only the holder
   * of the issuer decryption key can say what is inside it ([PaSO Risk Signals] Section 6.1). A
   * third-party Authorizing Party would have nothing to put here.
   */
  decryptedRiskSignals?: unknown
}

/**
 * `jti` replay cache, per [PaSO Proof Verify] Section 3 step 4.
 *
 * In-memory is right for a playground and wrong for anything else: under [PSD2] `jti` is the
 * Authentication Code, and a cache that empties on restart lets an old proof through.
 */
const seenJtiValues = new Set<string>()

function decodeJwtPayload(compact: string): Record<string, unknown> {
  return JSON.parse(TypedArrayEncoder.toUtf8String(TypedArrayEncoder.fromBase64Url(compact.split('.')[1])))
}

function decodeJwtHeader(compact: string): Record<string, unknown> {
  return JSON.parse(TypedArrayEncoder.toUtf8String(TypedArrayEncoder.fromBase64Url(compact.split('.')[0])))
}

/** The Key Binding JWT of an SD-JWT VC presentation: the segment after the final `~`. */
function getKeyBindingJwt(compactSdJwtVc: string): string | undefined {
  const keyBindingJwt = compactSdJwtVc.split('~').pop()
  return keyBindingJwt?.includes('.') ? keyBindingJwt : undefined
}

export interface PasoProofPackage {
  /** The signed [OID4VP] Authorization Request ([JAR] Request Object), compact serialised. */
  signedRequest: string
  /** The `vp_token` exactly as the Wallet returned it. */
  vpToken: Record<string, string[] | string> | string
}

export async function verifyPasoProofPackage(proofPackage: PasoProofPackage): Promise<PasoVerificationResult> {
  const checks: PasoVerificationCheck[] = []
  const record = (check: string, passed: boolean, detail: string) => {
    checks.push({ check, passed, detail })
    return passed
  }

  // 1. Request verification.
  const requestPayload = decodeJwtPayload(proofPackage.signedRequest)
  const requestHeader = decodeJwtHeader(proofPackage.signedRequest)

  try {
    const x5c = requestHeader.x5c as string[] | undefined
    if (!x5c?.length) throw new Error('The Authorization Request carries no x5c certificate chain')

    const jwsService = agent.dependencyManager.resolve(JwsService)
    const { isValid } = await jwsService.verifyJws(agent.context, {
      jws: proofPackage.signedRequest,
      jwsSigner: { method: 'x5c', x5c, jwk: X509Certificate.fromEncodedCertificate(x5c[0]).publicJwk },
    })
    if (!isValid) throw new Error('Signature verification failed')

    // `trustedCertificates` is what makes this a trust check. Without it
    // `validateCertificateChain` verifies the chain's internal structure and stops there, which
    // accepts any self-signed chain — and Section 3 step 1 asks the Authorizing Party to "verify the
    // Relying Party's identity from the request", not merely that someone signed it.
    await X509Service.validateCertificateChain(agent.context, {
      certificateChain: x5c,
      trustedCertificates: [getX509RootCertificate().toString('pem')],
    })
    record('request_signature', true, `Signed by ${String(requestPayload.client_id)}`)
  } catch (error) {
    record('request_signature', false, error instanceof Error ? error.message : 'Unknown error')
  }

  // The PaSO-targeted entry. `transaction_data` entries are base64url-encoded JSON objects.
  const encodedEntries = Array.isArray(requestPayload.transaction_data)
    ? (requestPayload.transaction_data as string[])
    : []
  const pasoEntry = encodedEntries
    .map((encoded) => ({
      encoded,
      decoded: JSON.parse(TypedArrayEncoder.toUtf8String(TypedArrayEncoder.fromBase64Url(encoded))) as {
        type: string
        credential_ids: string[]
        payload: Record<string, unknown>
      },
    }))
    .find(({ decoded }) => decoded.type.startsWith('urn:paso:sca:'))

  if (!pasoEntry) {
    record('transaction_data', false, 'The Authorization Request contains no PaSO transaction data entry')
    return { accepted: false, checks }
  }
  record('transaction_data', true, `Found ${pasoEntry.decoded.type}`)

  // 2 & 3. Credential and holder binding proof verification.
  const [credentialQueryId] = pasoEntry.decoded.credential_ids
  const vpToken = typeof proofPackage.vpToken === 'string' ? {} : proofPackage.vpToken
  const presentationValue = vpToken[credentialQueryId]
  const presentation = Array.isArray(presentationValue) ? presentationValue[0] : presentationValue

  if (typeof presentation !== 'string') {
    record('credential_presence', false, `The vp_token contains no presentation for '${credentialQueryId}'`)
    return { accepted: false, checks }
  }

  try {
    await agent.sdJwtVc.verify({
      compactSdJwtVc: presentation,
      keyBinding: {
        audience: String(requestPayload.client_id),
        nonce: String(requestPayload.nonce),
      },
    })
    record('credential_and_holder_binding', true, 'Credential signature, validity and Key Binding JWT verified')
  } catch (error) {
    record('credential_and_holder_binding', false, error instanceof Error ? error.message : 'Unknown error')
  }

  const keyBindingJwt = getKeyBindingJwt(presentation)
  if (!keyBindingJwt) {
    record('holder_binding_proof', false, 'The presentation carries no Key Binding JWT')
    return { accepted: false, checks }
  }
  const proofClaims = decodeJwtPayload(keyBindingJwt)

  // 4. SCA response claims, per [PaSO Core] Section 6.1.
  const hashAlgorithm = String(proofClaims.transaction_data_hash_alg ?? 'sha-256')
  record(
    'transaction_data_hash_alg',
    hashAlgorithm === 'sha-256',
    `Reported ${hashAlgorithm}${hashAlgorithm === 'sha-256' ? '' : ', which this Authorizing Party does not accept'}`
  )

  const expectedTransactionDataHash = TypedArrayEncoder.toBase64Url(Hasher.hash(pasoEntry.encoded, 'sha-256'))
  record(
    'transaction_data_hash',
    proofClaims.transaction_data_hash === expectedTransactionDataHash,
    proofClaims.transaction_data_hash === expectedTransactionDataHash
      ? 'Matches the transaction data entry in the request'
      : `Expected ${expectedTransactionDataHash}, received ${String(proofClaims.transaction_data_hash)}`
  )

  const expectedRequestIntegrity = computeSriIntegrity(proofPackage.signedRequest)
  record(
    'request_integrity',
    proofClaims.request_integrity === expectedRequestIntegrity,
    proofClaims.request_integrity === expectedRequestIntegrity
      ? 'Matches the signed Authorization Request'
      : `Expected ${expectedRequestIntegrity}, received ${String(proofClaims.request_integrity)}`
  )

  // Conditional: checked only when the Wallet says it used a signed metadata JWT.
  if (proofClaims.metadata_integrity !== undefined) {
    const issued = getIssuedPasoMetadataIntegrityValues()
    record(
      'metadata_integrity',
      issued.includes(String(proofClaims.metadata_integrity)),
      issued.includes(String(proofClaims.metadata_integrity))
        ? 'Matches a signed credential metadata JWT issued by this Attestation Provider'
        : `Received ${String(proofClaims.metadata_integrity)}, which matches none of the ${issued.length} metadata JWT(s) currently in circulation`
    )
  }

  const typeMetadata = getPasoTransactionDataTypeMetadata(pasoEntry.decoded.type)
  const displayLocale = String(proofClaims.display_locale ?? '')
  const localeCovered =
    typeMetadata !== undefined &&
    [
      ...typeMetadata.claims.filter((claim) => claim.display).map((claim) => claim.display ?? []),
      ...Object.values(typeMetadata.ui_labels ?? {}),
    ].every(
      (entries) =>
        lookupLanguageTag(
          displayLocale,
          entries.filter((entry) => entry.locale !== undefined).map((entry) => entry.locale as string)
        ) !== undefined || entries.some((entry) => entry.locale === undefined)
    )
  record(
    'display_locale',
    localeCovered,
    localeCovered
      ? `The credential metadata provides complete display entries for '${displayLocale}'`
      : `The credential metadata has no complete display coverage for '${displayLocale}'`
  )

  const jti = String(proofClaims.jti ?? '')
  const isReplay = jti.length === 0 || seenJtiValues.has(jti)
  if (!isReplay) seenJtiValues.add(jti)
  record('jti_uniqueness', !isReplay, isReplay ? `'${jti}' has already been processed` : `'${jti}' is fresh`)

  record(
    'wallet_instance_version',
    typeof proofClaims.wallet_instance_version === 'string',
    String(proofClaims.wallet_instance_version ?? 'absent')
  )

  // 5. Payload verification, delegated to the Transaction Data Type Rulebook.
  if (pasoEntry.decoded.type === pasoPaymentTransactionDataType) {
    const payloadIssue = validatePasoPaymentPayload(pasoEntry.decoded.payload)
    record('payload_conformance', payloadIssue === undefined, payloadIssue ?? 'Conforms to the Basic Payments rulebook')
  } else {
    record('payload_conformance', false, `No rulebook implementation for ${pasoEntry.decoded.type}`)
  }

  // 6. Risk signals, per [PaSO Risk Signals] Section 6.
  const riskSignalResolution = resolveEffectiveRiskSignalSet(typeMetadata)

  // A profile this deployment cannot resolve means it cannot know which signals were required, nor
  // whether the profile mandated encryption. That is a verification failure, not a detail: Section 6
  // step 1 is a check against the resolved set, and there is no resolved set.
  for (const profile of riskSignalResolution.unknownProfiles) {
    record('risk_signal_profile', false, `Referenced profile '${profile}' cannot be resolved`)
  }

  const riskSignals = await verifyRiskSignals({
    riskSignals: proofClaims.risk_signals,
    effectiveSignalSet: riskSignalResolution.signals,
    encryptionRequired: riskSignalResolution.encryptionRequired,
    responseMode: String(requestPayload.response_mode ?? 'fragment'),
  })
  checks.push(...riskSignals.checks)

  return {
    accepted: checks.every((check) => check.passed),
    checks,
    decryptedRiskSignals: riskSignals.decrypted,
  }
}

interface RiskSignalVerification {
  checks: PasoVerificationCheck[]
  /** The plaintext array, only when it arrived encrypted and decryption succeeded. */
  decrypted?: unknown
}

async function verifyRiskSignals(options: {
  riskSignals: unknown
  effectiveSignalSet: Array<{ type: string; required: boolean; maxAge?: number }>
  encryptionRequired: boolean
  responseMode: string
}): Promise<RiskSignalVerification> {
  const { riskSignals, effectiveSignalSet, encryptionRequired, responseMode } = options
  const required = effectiveSignalSet.filter((signal) => signal.required)
  const checks: PasoVerificationCheck[] = []

  // Checked before the encryption branch: with nothing required there is no array for the wallet to
  // have encrypted, and Section 7.7's "expect an encrypted structure" is about the value that would
  // otherwise have been the plaintext one.
  if (required.length === 0) {
    return { checks: [{ check: 'risk_signals', passed: true, detail: 'No risk signal resolved as required' }] }
  }

  // Section 6.1 splits verification where encryption is required. The Authorizing Party's own half is
  // the whole of what a *third-party* deployment could do: confirm that the value is an encrypted
  // structure, and reject a plaintext one. The other half — the per-signal checks — belongs to the
  // holder of the issuer decryption key, which in this first-party playground is this same process,
  // so both halves run below and the split stays visible in the reported checks.
  let signalsToCheck = riskSignals
  let decrypted: unknown
  if (encryptionRequired) {
    if (typeof riskSignals !== 'string') {
      return {
        checks: [
          {
            check: 'risk_signals_encrypted',
            passed: false,
            detail:
              'This transaction data type requires encrypted risk signals, but the value is not an encrypted structure',
          },
        ],
      }
    }

    checks.push({
      check: 'risk_signals_encrypted',
      passed: true,
      detail: 'A JWE compact string, as this transaction data type requires',
    })

    try {
      decrypted = await decryptPasoRiskSignals(riskSignals)
      signalsToCheck = decrypted
      checks.push({
        check: 'risk_signals_decryption',
        passed: true,
        detail: 'Decrypted with the issuer encryption key published in the signed credential metadata',
      })
    } catch (error) {
      return {
        checks: [
          ...checks,
          {
            check: 'risk_signals_decryption',
            passed: false,
            detail: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      }
    }
  }

  if (typeof signalsToCheck === 'string') {
    return {
      checks: [
        {
          check: 'risk_signals',
          passed: false,
          detail: 'Received an encrypted structure, but this transaction data type does not require encryption',
        },
      ],
    }
  }

  if (!Array.isArray(signalsToCheck)) {
    return {
      checks: [
        ...checks,
        { check: 'risk_signals', passed: false, detail: 'The risk_signals claim is absent or not an array' },
      ],
      decrypted,
    }
  }

  const envelopes = signalsToCheck as Array<Record<string, unknown>>
  const now = Date.now()

  for (const signal of required) {
    const envelope = envelopes.find((candidate) => candidate.type === signal.type)
    if (!envelope) {
      checks.push({ check: `risk_signal:${signal.type}`, passed: false, detail: 'Required signal is missing' })
      continue
    }

    // Well-formedness, per Section 6 step 2. `unavailable` and `denied` are valid answers — the
    // Authorizing Party decides what to do with them, and rejecting here would defeat the point.
    const status = envelope.status
    const statusIsValid = status === 'ok' || status === 'unavailable' || status === 'denied'
    const valueMatchesStatus = (status === 'ok') === (envelope.value !== undefined)
    const collectedAt = Date.parse(String(envelope.collected_at))
    const timestampIsValid = !Number.isNaN(collectedAt)

    if (!statusIsValid || !valueMatchesStatus || !timestampIsValid) {
      checks.push({ check: `risk_signal:${signal.type}`, passed: false, detail: 'Envelope is malformed' })
      continue
    }

    // Freshness, per Section 6 step 3, measured from receipt with room for forwarding delay.
    if (signal.maxAge !== undefined && now - collectedAt > (signal.maxAge + 60) * 1000) {
      checks.push({
        check: `risk_signal:${signal.type}`,
        passed: false,
        detail: `Collected ${Math.round((now - collectedAt) / 1000)}s ago, older than the resolved max_age of ${signal.maxAge}s`,
      })
      continue
    }

    if (signal.type === 'urn:paso:risk:global:response_mode:1' && status === 'ok' && envelope.value !== responseMode) {
      checks.push({
        check: `risk_signal:${signal.type}`,
        passed: false,
        detail: `Reported '${String(envelope.value)}' but the request used '${responseMode}'`,
      })
      continue
    }

    if (signal.type === 'urn:paso:risk:global:amr:1' && status === 'ok') {
      // The Basic Payments rulebook delegates the acceptance criteria to the Authorizing Party. Under
      // [PSD2] Article 4(30) that means two independent categories, which is what we ask for here.
      const methods = (envelope.value as string[]) ?? []
      const categories = {
        knowledge: ['pin', 'pwd'],
        possession: ['hwk', 'swk', 'otp'],
        inherence: ['bio_strong', 'bio_weak'],
      }
      const covered = Object.entries(categories).filter(([, values]) => values.some((value) => methods.includes(value)))
      checks.push({
        check: `risk_signal:${signal.type}`,
        passed: covered.length >= 2,
        detail: `Reported ${methods.join(', ') || 'nothing'} — ${covered.length} of the three [PSD2] factor categories`,
      })
      continue
    }

    checks.push({
      check: `risk_signal:${signal.type}`,
      passed: true,
      detail: `status '${String(status)}'${status === 'ok' ? `, value ${JSON.stringify(envelope.value)}` : ''}`,
    })
  }

  return { checks, decrypted }
}

/** The PaSO transaction data entry of a request, if it has one. */
export function getPasoTransactionDataEntry(authorizationRequestJwt: string | undefined) {
  if (!authorizationRequestJwt) return undefined

  const transactionData = Jwt.fromSerializedJwt(authorizationRequestJwt).payload.additionalClaims.transaction_data
  if (!Array.isArray(transactionData)) return undefined

  for (const encoded of transactionData) {
    if (typeof encoded !== 'string') continue
    const decoded = JSON.parse(TypedArrayEncoder.toUtf8String(TypedArrayEncoder.fromBase64Url(encoded)))
    if (typeof decoded?.type === 'string' && decoded.type.startsWith('urn:paso:sca:')) return { encoded, decoded }
  }

  return undefined
}
