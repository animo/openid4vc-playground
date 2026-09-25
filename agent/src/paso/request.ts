import { randomUUID } from 'node:crypto'
import { agent } from '../agent.js'
import { computeSriIntegrity } from './metadata.js'
import { pasoPaymentTransactionDataType } from './paymentRulebook.js'

/**
 * Building the Relying Party side of a PaSO payment request.
 *
 * https://aptitude-consortium.github.io/payments-and-sca-for-openid/draft-2/rulebooks/transaction_data/Payment/
 */

/**
 * The `#integrity` value for a payee logo, computed from the bytes actually served.
 *
 * [PaSO View] Section 3 makes a mismatch fatal: the wallet treats the whole `transaction_data` entry
 * as incompatible. Hashing the served response rather than a file on disk is what keeps the two in
 * step when the asset is proxied, resized or re-encoded on the way out.
 */
const payeeLogoIntegrityCache = new Map<string, string>()

/** [PaSO View] Section 3 — "MUST NOT exceed 512 KiB in encoded size". */
const maxPayeeLogoBytes = 512 * 1024

/** The media types Section 3 has a Wallet support. */
const supportedPayeeLogoMediaTypes = ['image/png', 'image/jpeg', 'image/svg+xml']

export async function getPayeeLogoIntegrity(logoUrl: string): Promise<string | undefined> {
  const cached = payeeLogoIntegrityCache.get(logoUrl)
  if (cached) return cached

  try {
    const response = await fetch(logoUrl)
    if (!response.ok) throw new Error(`Received status ${response.status}`)

    const bytes = new Uint8Array(await response.arrayBuffer())
    const [mediaType] = (response.headers.get('content-type') ?? '').split(';')

    // The Section 3 limits are checked here as well as in the wallet, because a Relying Party that
    // sends an image breaking any of them has built a request no conforming wallet can authorize —
    // and the failure surfaces there as an integrity error rather than as "your logo is too big".
    // Section 3's pixel bound is left to the wallet; it needs the decoded image, and size is what
    // an asset pipeline actually gets wrong.
    if (bytes.length > maxPayeeLogoBytes) {
      throw new Error(`Encoded size ${bytes.length} exceeds the 512 KiB limit of [PaSO View] Section 3`)
    }
    if (!supportedPayeeLogoMediaTypes.includes(mediaType.trim().toLowerCase())) {
      throw new Error(`Media type '${mediaType}' is not one a wallet has to support`)
    }

    const integrity = computeSriIntegrity(bytes)
    payeeLogoIntegrityCache.set(logoUrl, integrity)
    return integrity
  } catch (error) {
    // The logo is optional in the rulebook, so a request without it is still valid. Sending one the
    // wallet will refuse is not.
    agent.config.logger.warn(`paso: omitting the payee logo ${logoUrl}`, { error })
    return undefined
  }
}

export interface PasoPaymentRequestOptions {
  credentialQueryId: string
  amount: string
  payeeName: string
  /** The Payee's national tax identifier or business registry number — not an IBAN, as in TS 12. */
  payeeId: string
  payeeLogoUrl?: string
}

/**
 * A `urn:paso:sca:global:payment:1` transaction data entry.
 *
 * Six claims, in the rulebook's normative order. Everything TS 12 carried and PaSO dropped —
 * `date_time`, `remittance_info`, `execution_date`, the whole `pisp` object, `payee.website` — is
 * gone rather than moved: a payload containing them does not conform, and a conforming wallet
 * refuses the transaction.
 */
export async function createPasoPaymentTransactionDataEntry(options: PasoPaymentRequestOptions) {
  // [PaSO View] Section 3 requires `https` for a resolvable image URL, so an `http` one — which is
  // what a local development host serves — would make the whole entry incompatible in a conforming
  // wallet. The logo is optional; a request without it is better than one nothing can authorize.
  const canUseLogo = options.payeeLogoUrl?.startsWith('https://') ?? false
  if (options.payeeLogoUrl && !canUseLogo) {
    agent.config.logger.warn(`paso: omitting the payee logo, '${options.payeeLogoUrl}' is not an https URL`)
  }

  const logoIntegrity = canUseLogo ? await getPayeeLogoIntegrity(options.payeeLogoUrl as string) : undefined
  const includeLogo = canUseLogo && logoIntegrity !== undefined

  return {
    type: pasoPaymentTransactionDataType,
    credential_ids: [options.credentialQueryId] as [string, ...string[]],
    transaction_data_hashes_alg: ['sha-256'] as [string, ...string[]],
    payload: {
      transaction_id: randomUUID(),
      amount: options.amount,
      payee: {
        name: options.payeeName,
        id: options.payeeId,
        ...(includeLogo ? { logo: options.payeeLogoUrl as string, 'logo#integrity': logoIntegrity as string } : {}),
      },
    },
  }
}
