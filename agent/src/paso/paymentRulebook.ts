/**
 * The Basic Payments Transaction Data Type Rulebook, Authorizing Party side.
 *
 * https://aptitude-consortium.github.io/payments-and-sca-for-openid/draft-2/rulebooks/transaction_data/Payment/
 *
 * [PaSO Proof Verify] Section 3 step 5 defers payload verification entirely to the rulebook, and the
 * rulebook's own Section 2 adds the checks below the structural ones: `payee.id` against a tax
 * authority or business registry, and `amount` against the payment network's rules.
 *
 * Two forms of the payload are accepted. The rulebook's own has `amount` as an `iso_currency_amount`
 * string ("49.00 EUR") and no `currency`. WPA Rulebook v1.1 Section 4.6 has `amount` as a JSON
 * number in major units, `currency` as a separate claim, and `transaction_id` required, and marks
 * that deviation as open.
 */

import z from 'zod'

export const pasoPaymentTransactionDataType = 'urn:paso:sca:global:payment:1'

const isoCurrencyAmountPattern = /^\d+(?:\.(\d+))? ([A-Z]{3})$/

/**
 * [ISO4217] minor units of the currencies this Authorizing Party settles in. [PaSO View] Section 3
 * has `iso_currency_amount` carry exactly that many fractional digits, so `100 EUR` or `1.5 EUR` are
 * as malformed as `1.505 EUR`.
 */
const iso4217MinorUnits: Record<string, number> = { EUR: 2, JPY: 0 }

/** Returns the reason an `iso_currency_amount` value is malformed, or `undefined` when it is not. */
export function getIsoCurrencyAmountIssue(name: string, amount: string): string | undefined {
  const amountMatch = isoCurrencyAmountPattern.exec(amount)
  if (!amountMatch) {
    return `'${name}' must be a decimal amount followed by an ISO 4217 code, received ${JSON.stringify(amount)}`
  }
  const [, fraction = '', currency] = amountMatch
  const minorUnits = iso4217MinorUnits[currency]
  if (minorUnits === undefined) return `'${name}' is in ${currency}, which this Authorizing Party does not settle in`
  if (fraction.length !== minorUnits) {
    return `'${name}' must have exactly ${minorUnits} fractional digit(s) for ${currency}, received ${JSON.stringify(amount)}`
  }
  return undefined
}

/** [PaSO View] Section 3 `image`: a resolvable URL needs `https` and a sibling `#integrity`. */
export function refineLogo(prefix: string) {
  return (party: { logo?: string; 'logo#integrity'?: unknown }, ctx: z.RefinementCtx) => {
    if (party.logo === undefined || party.logo.startsWith('data:')) return
    if (!party.logo.startsWith('https://')) {
      ctx.addIssue({ code: 'custom', message: `'${prefix}.logo' is a URL but does not use the https scheme` })
    } else if (typeof party['logo#integrity'] !== 'string') {
      ctx.addIssue({
        code: 'custom',
        message: `'${prefix}.logo' is a resolvable URL but '${prefix}.logo#integrity' is missing`,
      })
    }
  }
}

const payeeSchema = z
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
  .superRefine(refineLogo('payee'))

const undeclaredFieldsError = {
  error: (issue: z.core.$ZodRawIssue) =>
    issue.code === 'unrecognized_keys' ? `Undeclared field(s): ${issue.keys.join(', ')}` : undefined,
}

const pasoPaymentPayloadSchema = z.strictObject(
  {
    transaction_id: z.unknown().optional(),
    amount: z
      .string({
        error: (issue) =>
          `'amount' must be a decimal amount followed by an ISO 4217 code, received ${JSON.stringify(issue.input)}`,
      })
      .superRefine((amount, ctx) => {
        const issue = getIsoCurrencyAmountIssue('amount', amount)
        if (issue) ctx.addIssue({ code: 'custom', message: issue })
      }),
    payee: payeeSchema,
  },
  undeclaredFieldsError
)

const weroPaymentPayloadSchema = z.strictObject(
  {
    transaction_id: z.uuid({ error: "'transaction_id' must be a UUID" }),
    amount: z
      .number()
      .min(0, { error: "'amount' must not be negative" })
      // A JSON number in major units with at most two decimals: 49, 49.5 and 49.50 are all 49.50.
      .refine((amount) => Number(amount.toFixed(2)) === amount, {
        error: "'amount' must have at most two decimals",
      }),
    currency: z.literal('EUR', { error: "'currency' must be EUR" }),
    payee: payeeSchema,
  },
  undeclaredFieldsError
)

/** Returns the reason the payload does not conform, or `undefined` when it does. */
export function validatePasoPaymentPayload(payload: Record<string, unknown>): string | undefined {
  const isWeroForm = typeof payload.amount === 'number'
  const result = (isWeroForm ? weroPaymentPayloadSchema : pasoPaymentPayloadSchema).safeParse(payload)
  if (!result.success) return result.error.issues.map((issue) => issue.message).join('; ')

  // Rulebook Section 2 item 2: the amount conforms to the payment network's rules. Stubbed to a range
  // check here — a real Authorizing Party asks its scheme.
  const amount = isWeroForm ? (payload.amount as number) : Number.parseFloat(payload.amount as string)
  if (amount <= 0) return "'amount' must be greater than zero"
  return undefined
}
