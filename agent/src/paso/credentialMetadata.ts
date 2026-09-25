import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { JwsService, JwtPayload, Kms } from '@credo-ts/core'
import { agent } from '../agent.js'
import { AGENT_HOST } from '../constants.js'
import {
  openHorizonBankPasoCredentialMetadata,
  openHorizonIssuerId,
  weroPasoConfiguration,
} from '../issuers/openHorizonBank.js'
import { dcsId, getX509DcsCertificate } from '../keyMethods/index.js'
import { dateToSeconds } from '../utils/date.js'
import { computeSriIntegrity, restrictPasoMetadataToLocales } from './metadata.js'
import { getPasoRiskSignalsEncryptionJwk } from './riskSignalsEncryption.js'

/**
 * The signed credential metadata JWTs this Attestation Provider has issued, cached by locale set.
 *
 * The cache is not an optimisation. [PaSO Proof Verify] Section 3 has the Authorizing Party check
 * `metadata_integrity` against "the Attestation Provider's *current* signed credential metadata JWT",
 * which only works if fetching twice returns the same bytes. Signing on every request — as the TS 12
 * endpoint does — puts a fresh `iat` in each JWT and makes the claim unverifiable by construction.
 *
 * And it outlives the process for the same reason. A wallet holds the JWT it was served for as long
 * as that JWT is valid; an Authorizing Party whose record of what it issued lives only in memory
 * starts rejecting every proof the moment it restarts, on a `metadata_integrity` value that is
 * perfectly correct. ECDSA signatures are randomised, so re-signing the same payload would not
 * reproduce the bytes — the issued JWT itself has to be kept.
 */
const issuedMetadataJwts = new Map<string, { jwt: string; expiresAt: number }>()

/** Short enough that a wallet exercises renewal, long enough to survive a demo session. */
const metadataValiditySeconds = 24 * 60 * 60

const issuedMetadataJwtsPath = join(process.cwd(), '.paso', 'issued-credential-metadata.json')

/**
 * Bumped whenever the metadata document itself changes shape, so cached JWTs of an older shape are
 * never served again.
 *
 * The cache is keyed on the locales alone otherwise, so a JWT served from it would be one written
 * before the change: without `risk_signals_encryption_keys`, which has the wallet send plaintext risk
 * signals that the Authorizing Party then rejects (see `verify.ts`), or with the old
 * `credential_metadata_uri`, which [PaSO Proof Metadata] Section 8 has the wallet compare against the
 * URI it fetched from — a mismatch fails verification outright.
 */
const metadataDocumentVersion = 'v3-metadata-uri-under-api'

/**
 * The credential metadata document as served, for the locales of this JWT.
 *
 * [PaSO Risk Signals] Section 7.3 has the issuer publish its encryption keys under
 * `risk_signals_encryption_keys`, and the signed JWT is what makes them integrity-verified — a key
 * a wallet picked up anywhere else "SHALL be treated as absent". The keys are added here rather than
 * declared alongside the rest of the metadata because they only exist once the agent has started.
 */
export function getPasoCredentialMetadataDocument(servedLocales: string[]) {
  return {
    ...restrictPasoMetadataToLocales(openHorizonBankPasoCredentialMetadata, servedLocales),
    risk_signals_encryption_keys: { keys: [getPasoRiskSignalsEncryptionJwk()] },
  }
}

function loadIssuedMetadataJwts() {
  try {
    const stored = JSON.parse(readFileSync(issuedMetadataJwtsPath, 'utf8')) as Record<
      string,
      { jwt: string; expiresAt: number }
    >
    const now = Date.now()
    for (const [cacheKey, entry] of Object.entries(stored)) {
      if (entry.expiresAt > now) issuedMetadataJwts.set(cacheKey, entry)
    }
  } catch {
    // No file yet, or one written by an incompatible version. Either way there is nothing to honour.
  }
}

function persistIssuedMetadataJwts() {
  try {
    mkdirSync(dirname(issuedMetadataJwtsPath), { recursive: true })
    writeFileSync(issuedMetadataJwtsPath, JSON.stringify(Object.fromEntries(issuedMetadataJwts)))
  } catch (error) {
    agent.config.logger.warn('paso: could not persist the issued credential metadata JWTs', { error })
  }
}

loadIssuedMetadataJwts()

export async function getPasoCredentialMetadataJwt(servedLocales: string[]): Promise<string> {
  if (!dcsId) throw new Error('The DCS signing key is not available')

  const cacheKey = `${metadataDocumentVersion}:${servedLocales.join(',')}`
  const cached = issuedMetadataJwts.get(cacheKey)
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.jwt

  const now = new Date()
  const expiry = new Date(now.getTime() + metadataValiditySeconds * 1000)

  const jwsService = agent.dependencyManager.resolve(JwsService)
  const jwt = await jwsService.createJwsCompact(agent.context, {
    keyId: dcsId,
    payload: new JwtPayload({
      // The Credential Issuer Identifier, which is what the credential's own `iss` claim carries and
      // what [PaSO Proof Metadata] Section 6 step 4 compares against. Not the internal issuer UUID.
      iss: (await agent.openid4vc.issuer.getIssuerMetadata(openHorizonIssuerId)).credentialIssuer.credential_issuer,
      // [PaSO Proof Metadata] Section 6 step 6 binds the JWT to the credential by comparing `sub`
      // with the credential's `vct`. A placeholder here fails verification in the wallet.
      sub: weroPasoConfiguration.vct,
      iat: dateToSeconds(now),
      exp: dateToSeconds(expiry),
      additionalClaims: {
        format: 'dc+sd-jwt',
        credential_metadata_uri: `${AGENT_HOST}/api/paso-credential-metadata`,
        credential_metadata: getPasoCredentialMetadataDocument(servedLocales),
      },
    }),
    protectedHeaderOptions: {
      alg: Kms.KnownJwaSignatureAlgorithms.ES256,
      typ: 'credential-metadata+jwt',
      // The same single Document Signer certificate the credential itself is signed with.
      // [PaSO Proof Metadata] Section 6 step 6 compares the two chains' roots and leaf subjects, so
      // sending a longer chain here than the credential carries would fail that comparison. The
      // wallet still validates it against its trust store: the chain builder pulls the Animo root in
      // from the trusted certificates.
      x5c: [getX509DcsCertificate().toString('pem')],
    },
  })

  issuedMetadataJwts.set(cacheKey, { jwt, expiresAt: expiry.getTime() })
  persistIssuedMetadataJwts()
  return jwt
}

/**
 * The [W3C.SRI] values of every metadata JWT still in circulation.
 *
 * A wallet holds the JWT it was served, which covers whichever locales it asked for, so the
 * Authorizing Party has to accept the integrity value of any of them — not just the most recent.
 */
export function getIssuedPasoMetadataIntegrityValues(): string[] {
  const now = Date.now()
  return [...issuedMetadataJwts.values()]
    .filter((entry) => entry.expiresAt > now)
    .map((entry) => computeSriIntegrity(entry.jwt))
}

/** The metadata as served, for the Authorizing Party's `display_locale` and risk-signal checks. */
export function getPasoTransactionDataTypeMetadata(type: string) {
  return (openHorizonBankPasoCredentialMetadata.transaction_data_types as Record<string, unknown>)[type] as
    | {
        claims: Array<{ path: string[]; display?: Array<{ locale?: string }> }>
        ui_labels?: Record<string, Array<{ locale?: string }>>
        risk_signal_profiles?: string[]
        risk_signals?: Array<{ type: string; required?: boolean; max_age?: number }>
        /** [PaSO Risk Signals] Section 7.2 item 2 — the metadata's own encryption trigger. */
        encrypted?: boolean
      }
    | undefined
}
