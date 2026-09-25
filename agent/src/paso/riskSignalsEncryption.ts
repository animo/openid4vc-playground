import { transformSeedToPrivateJwk } from '@credo-ts/askar'
import { Hasher, Kms, TypedArrayEncoder } from '@credo-ts/core'
import { agent } from '../agent.js'
import { DCS_P256_SEED } from '../constants.js'

/**
 * The issuer's risk signal encryption key, per [PaSO Risk Signals] Section 7.
 *
 * https://aptitude-consortium.github.io/payments-and-sca-for-openid/draft-2/specifications/proof/paso-proof-risk-signals/
 *
 * This deployment is Attestation Provider, Relying Party and Authorizing Party at once ([PaSO Core]
 * Section 3), so the key published in the signed credential metadata and the key that decrypts are
 * the same one. In a third-party flow they would be held by different parties — that is the entire
 * point of encrypting: the Relying Party forwarding the proof package could not read the signals.
 *
 * Derived from `DCS_P256_SEED` rather than generated, because the key has to survive a restart. The
 * signed metadata JWTs this issuer has served are cached across restarts (see
 * `credentialMetadata.ts`) and each carries this public key; a key regenerated on boot would leave
 * every wallet encrypting to a key nothing can decrypt, with a `metadata_integrity` that still
 * checks out.
 */

/** The `kid` published in the JWK Set, and the key store identifier — deliberately the same string. */
export const pasoRiskSignalsEncryptionKeyId = 'paso-risk-signals-enc-1'

let publicJwk: Kms.KmsJwkPublicEc | undefined

export async function setupPasoRiskSignalsEncryptionKey() {
  const { privateJwk } = transformSeedToPrivateJwk({
    type: { kty: 'EC', crv: 'P-256' },
    // A separate key from the Document Signer: [PaSO Risk Signals] Section 7.3 has this one published
    // for key agreement, and a signing key doing double duty as an encryption key is the kind of
    // reuse that makes a compromise of either worse.
    seed: Hasher.hash(TypedArrayEncoder.fromUtf8String(`${DCS_P256_SEED}:paso-risk-signals`), 'sha-256'),
  })

  try {
    const imported = await agent.kms.importKey({
      privateJwk: { ...privateJwk, kid: pasoRiskSignalsEncryptionKeyId },
    })
    publicJwk = imported.publicJwk
  } catch (error) {
    if (!(error instanceof Kms.KeyManagementKeyExistsError)) throw error
    publicJwk = (await agent.kms.getPublicKey({ keyId: pasoRiskSignalsEncryptionKeyId })) as Kms.KmsJwkPublicEc
  }
}

/**
 * The published key, as a JWK Set member of [PaSO Risk Signals] Section 7.3.
 *
 * `use`, `kid` and `alg` are all three required by that section: they are what tells a wallet the
 * key is meant for this, which identifier to put in the JWE header, and which key management
 * algorithm to derive with.
 */
export function getPasoRiskSignalsEncryptionJwk() {
  if (!publicJwk) throw new Error('The PaSO risk signals encryption key is not set up')

  return {
    kty: publicJwk.kty,
    crv: publicJwk.crv,
    x: publicJwk.x,
    y: publicJwk.y,
    use: 'enc',
    kid: pasoRiskSignalsEncryptionKeyId,
    alg: 'ECDH-ES',
  }
}

/**
 * Decrypts a `risk_signals` JWE compact string back into the plaintext array.
 *
 * [PaSO Risk Signals] Section 6.1 gives this to "the holder of the issuer decryption key", which
 * here is the same process that verifies the proof. Section 7.6 fixes the baseline to `ECDH-ES` over
 * `P-256` with `A256GCM`, and anything else is refused rather than attempted: a wallet that used an
 * algorithm this issuer never published a key for did not encrypt to this issuer.
 */
export async function decryptPasoRiskSignals(jwe: string): Promise<unknown> {
  const segments = jwe.split('.')
  if (segments.length !== 5) throw new Error('The risk_signals value is not a JWE in compact serialization')

  const [encodedHeader, encodedKey, encodedIv, encodedCiphertext, encodedTag] = segments
  const header = JSON.parse(TypedArrayEncoder.toUtf8String(TypedArrayEncoder.fromBase64Url(encodedHeader)))

  if (header.alg !== 'ECDH-ES' || header.enc !== 'A256GCM') {
    throw new Error(`Unsupported JWE algorithms '${String(header.alg)}' and '${String(header.enc)}'`)
  }
  if (header.kid !== pasoRiskSignalsEncryptionKeyId) {
    throw new Error(`The JWE is encrypted to key '${String(header.kid)}', which this issuer does not hold`)
  }
  // ECDH-ES derives the content encryption key rather than wrapping one, so a non-empty encrypted key
  // segment means the wallet used a different key management mode than its own header declares.
  if (encodedKey.length !== 0) throw new Error('ECDH-ES expects an empty encrypted key segment')

  const decrypted = await agent.kms.decrypt({
    encrypted: TypedArrayEncoder.fromBase64Url(encodedCiphertext),
    decryption: {
      algorithm: 'A256GCM',
      // The protected header is the additional authenticated data, per [RFC7516] Section 5.1 —
      // which is what stops an intermediary swapping the `kid` for a key it holds.
      aad: TypedArrayEncoder.fromUtf8String(encodedHeader),
      iv: TypedArrayEncoder.fromBase64Url(encodedIv),
      tag: TypedArrayEncoder.fromBase64Url(encodedTag),
    },
    key: {
      keyAgreement: {
        algorithm: 'ECDH-ES',
        keyId: pasoRiskSignalsEncryptionKeyId,
        externalPublicJwk: Kms.PublicJwk.fromUnknown(header.epk).toJson() as Kms.KmsJwkPublicEc,
      },
    },
  })

  return JSON.parse(TypedArrayEncoder.toUtf8String(decrypted.data))
}
