/**
 * The Basic Payments Transaction Data Type Rulebook, Authorizing Party side.
 *
 * https://aptitude-consortium.github.io/payments-and-sca-for-openid/draft-2/rulebooks/transaction_data/Payment/
 *
 * [PaSO Proof Verify] Section 3 step 5 defers payload verification entirely to the rulebook, and the
 * rulebook's own Section 2 adds the checks below the structural ones: `payee.id` against a tax
 * authority or business registry, and `amount` against the payment network's rules.
 */

export const pasoPaymentTransactionDataType = 'urn:paso:sca:global:payment:1'

const isoCurrencyAmountPattern = /^\d+(\.\d{1,4})? [A-Z]{3}$/

/** Returns the reason the payload does not conform, or `undefined` when it does. */
export function validatePasoPaymentPayload(payload: Record<string, unknown>): string | undefined {
  const allowedKeys = ['transaction_id', 'amount', 'payee']
  const unexpected = Object.keys(payload).filter((key) => !allowedKeys.includes(key))
  if (unexpected.length > 0) return `Undeclared field(s): ${unexpected.join(', ')}`

  if (typeof payload.amount !== 'string' || !isoCurrencyAmountPattern.test(payload.amount)) {
    return `'amount' must be a decimal amount followed by an ISO 4217 code, received ${JSON.stringify(payload.amount)}`
  }

  const payee = payload.payee as Record<string, unknown> | undefined
  if (!payee || typeof payee !== 'object') return "'payee' is required"

  const allowedPayeeKeys = ['name', 'id', 'logo', 'logo#integrity']
  const unexpectedPayee = Object.keys(payee).filter((key) => !allowedPayeeKeys.includes(key))
  if (unexpectedPayee.length > 0) return `Undeclared payee field(s): ${unexpectedPayee.join(', ')}`

  if (typeof payee.name !== 'string') return "'payee.name' is required"
  if (typeof payee.id !== 'string') return "'payee.id' is required"
  if (payee.logo !== undefined && typeof payee.logo !== 'string') return "'payee.logo' must be a string"
  if (typeof payee.logo === 'string' && !payee.logo.startsWith('data:')) {
    // [PaSO View] Section 3: a resolvable image URL "MUST use the `https` scheme" and the payload
    // "MUST contain a sibling claim at the same path suffixed with `#integrity`".
    if (!payee.logo.startsWith('https://')) return "'payee.logo' is a URL but does not use the https scheme"
    if (typeof payee['logo#integrity'] !== 'string') {
      return "'payee.logo' is a resolvable URL but 'payee.logo#integrity' is missing"
    }
  }

  // Rulebook Section 2 item 2: the amount conforms to the payment network's rules. Stubbed to a
  // range check here — a real Authorizing Party asks its scheme.
  const [amountValue] = payload.amount.split(' ')
  if (Number.parseFloat(amountValue) <= 0) return "'amount' must be greater than zero"

  return undefined
}
