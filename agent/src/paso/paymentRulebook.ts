/**
 * The Basic Payments Transaction Data Type Rulebook, Authorizing Party side.
 *
 * https://aptitude-consortium.github.io/payments-and-sca-for-openid/draft-2/rulebooks/transaction_data/Payment/
 *
 * [PaSO Proof Verify] Section 3 step 5 defers payload verification entirely to the rulebook, and the
 * rulebook's own Section 2 adds the checks below the structural ones: `payee.id` against a tax
 * authority or business registry, and `amount` against the payment network's rules.
 */

import z from 'zod'

export const pasoPaymentTransactionDataType = 'urn:paso:sca:global:payment:1'

const isoCurrencyAmountPattern = /^\d+(?:\.(\d+))? ([A-Z]{3})$/

/**
 * [ISO4217] minor units of the currencies this Authorizing Party settles in. [PaSO View] Section 3
 * has `iso_currency_amount` carry exactly that many fractional digits, so `100 EUR` or `1.5 EUR` are
 * as malformed as `1.505 EUR`.
 */
const iso4217MinorUnits: Record<string, number> = { EUR: 2 }

const pasoPaymentPayloadSchema = z.strictObject(
  {
    transaction_id: z.unknown().optional(),
    amount: z
      .string({
        error: (issue) =>
          `'amount' must be a decimal amount followed by an ISO 4217 code, received ${JSON.stringify(issue.input)}`,
      })
      .superRefine((amount, ctx) => {
        const amountMatch = isoCurrencyAmountPattern.exec(amount)
        if (!amountMatch) {
          ctx.addIssue({
            code: 'custom',
            message: `'amount' must be a decimal amount followed by an ISO 4217 code, received ${JSON.stringify(amount)}`,
          })
          return
        }
        const [, fraction = '', currency] = amountMatch
        const minorUnits = iso4217MinorUnits[currency]
        if (minorUnits === undefined) {
          ctx.addIssue({
            code: 'custom',
            message: `'amount' is in ${currency}, which this Authorizing Party does not settle in`,
          })
          return
        }
        if (fraction.length !== minorUnits) {
          ctx.addIssue({
            code: 'custom',
            message: `'amount' must have exactly ${minorUnits} fractional digit(s) for ${currency}, received ${JSON.stringify(amount)}`,
          })
          return
        }
        // Rulebook Section 2 item 2: the amount conforms to the payment network's rules. Stubbed to a
        // range check here — a real Authorizing Party asks its scheme.
        if (Number.parseFloat(amount) <= 0)
          ctx.addIssue({ code: 'custom', message: "'amount' must be greater than zero" })
      }),
    payee: z
      .strictObject(
        {
          name: z.string({ error: "'payee.name' is required" }),
          id: z.string({ error: "'payee.id' is required" }),
          logo: z.string({ error: "'payee.logo' must be a string" }).optional(),
          'logo#integrity': z.unknown().optional(),
        },
        {
          error: (issue) =>
            issue.code === 'unrecognized_keys'
              ? `Undeclared payee field(s): ${issue.keys.join(', ')}`
              : "'payee' is required",
        }
      )
      .superRefine((payee, ctx) => {
        if (payee.logo === undefined || payee.logo.startsWith('data:')) return
        // [PaSO View] Section 3: a resolvable image URL "MUST use the `https` scheme" and the payload
        // "MUST contain a sibling claim at the same path suffixed with `#integrity`".
        if (!payee.logo.startsWith('https://')) {
          ctx.addIssue({ code: 'custom', message: "'payee.logo' is a URL but does not use the https scheme" })
        } else if (typeof payee['logo#integrity'] !== 'string') {
          ctx.addIssue({
            code: 'custom',
            message: "'payee.logo' is a resolvable URL but 'payee.logo#integrity' is missing",
          })
        }
      }),
  },
  {
    error: (issue) =>
      issue.code === 'unrecognized_keys' ? `Undeclared field(s): ${issue.keys.join(', ')}` : undefined,
  }
)

/** Returns the reason the payload does not conform, or `undefined` when it does. */
export function validatePasoPaymentPayload(payload: Record<string, unknown>): string | undefined {
  const result = pasoPaymentPayloadSchema.safeParse(payload)
  if (result.success) return undefined
  return result.error.issues.map((issue) => issue.message).join('; ')
}
