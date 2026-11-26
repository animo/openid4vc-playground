import z from 'zod'
import type { PasoTransactionDataTypeMetadata } from './credentialMetadata.js'
import {
  getIsoCurrencyAmountIssue,
  pasoPaymentTransactionDataType,
  refineLogo,
  validatePasoPaymentPayload,
} from './paymentRulebook.js'

/**
 * Payload verification for every PaSO transaction data type, per [PaSO Proof Verify] Section 3 step 5,
 * which defers it to the type's rulebook. The Mandate and Generic checks are structural: the registry
 * lookups their rulebooks also ask for (mandatee, mandate uniqueness) have nothing to look up against
 * in a playground.
 */

const mandateTypePattern = /^urn:paso:sca:global:mandate(?::[a-z0-9-]+)?:1$/
const genericTypePattern = /^urn:paso:sca:global:generic(?::[a-z0-9-]+)?:1$/

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/
const isoDate = (name: string) =>
  z
    .string({ error: `'${name}' must be an ISO 8601 date` })
    .refine((value) => isoDatePattern.test(value) && !Number.isNaN(Date.parse(value)), {
      error: `'${name}' must be an ISO 8601 date`,
    })

const nonEmpty = (name: string) => z.string({ error: `'${name}' is required` }).min(1, `'${name}' is required`)

const paymentPayload = z.record(z.string(), z.unknown()).superRefine((payload, ctx) => {
  const issue = validatePasoPaymentPayload(payload)
  if (issue) ctx.addIssue({ code: 'custom', message: `payment_payload: ${issue}` })
})

/** Mandate rulebook Sections 2 and 3. */
const mandatePayloadSchema = z
  .strictObject({
    transaction_id: z.string().optional(),
    mandate_id: nonEmpty('mandate_id'),
    mandatee: z
      .strictObject({
        name: nonEmpty('mandatee.name'),
        id: z.string().optional(),
        logo: z.string().optional(),
        'logo#integrity': z.string().optional(),
      })
      .superRefine(refineLogo('mandatee')),
    action: nonEmpty('action'),
    conditions: z.string().optional(),
    max_amount: z
      .string()
      .superRefine((amount, ctx) => {
        const issue = getIsoCurrencyAmountIssue('max_amount', amount)
        if (issue) ctx.addIssue({ code: 'custom', message: issue })
      })
      .optional(),
    max_count: z.string().optional(),
    period: z.string().optional(),
    valid_from: isoDate('valid_from').optional(),
    valid_until: isoDate('valid_until'),
    payment_payload: paymentPayload.optional(),
  })
  .superRefine((mandate, ctx) => {
    if (mandate.valid_until < new Date().toISOString().slice(0, 10)) {
      ctx.addIssue({ code: 'custom', message: "'valid_until' is in the past" })
    }
    if (mandate.valid_from && mandate.valid_from > mandate.valid_until) {
      ctx.addIssue({ code: 'custom', message: "'valid_from' is later than 'valid_until'" })
    }
  })

/** Generic rulebook Section 3: at most 11 properties, and every custom claim a declared string or null. */
function getGenericPayloadIssue(payload: Record<string, unknown>, declaredKeys: unknown[]): string | undefined {
  if (Object.keys(payload).length > 11) return 'The payload has more than 11 properties'
  if (typeof payload.transaction_id !== 'string') return "'transaction_id' is required"

  for (const [key, value] of Object.entries(payload)) {
    if (key === 'transaction_id') continue
    if (key === 'payment_payload') {
      const issue = validatePasoPaymentPayload(value as Record<string, unknown>)
      if (issue) return `payment_payload: ${issue}`
      continue
    }
    if (!declaredKeys.includes(key)) return `'${key}' is not declared in the metadata`
    if (typeof value !== 'string' && value !== null) return `'${key}' must be a string or null`
  }
  return undefined
}

/** Returns which rulebook the payload was checked against, and why it does not conform if it does not. */
export function validatePasoPayload(
  type: string,
  payload: Record<string, unknown>,
  typeMetadata: PasoTransactionDataTypeMetadata | undefined
): { rulebook: string; issue?: string } {
  const declaredKeys = typeMetadata?.claims.map((claim) => claim.path[0]) ?? []

  if (type === pasoPaymentTransactionDataType) {
    return { rulebook: 'the Basic Payments rulebook', issue: validatePasoPaymentPayload(payload) }
  }
  if (mandateTypePattern.test(type)) {
    const result = mandatePayloadSchema.safeParse(payload)
    return { rulebook: 'the Mandate rulebook', issue: result.error?.issues.map((issue) => issue.message).join('; ') }
  }
  if (genericTypePattern.test(type)) {
    return { rulebook: 'the Generic rulebook', issue: getGenericPayloadIssue(payload, declaredKeys) }
  }

  // No rulebook, so the metadata is all there is to check against ([PaSO Core] Section 7.4.2).
  const undeclared = Object.keys(payload).filter((key) => !declaredKeys.includes(key))
  return {
    rulebook: 'its metadata, as no rulebook exists for this type',
    issue: undeclared.length > 0 ? `Undeclared field(s): ${undeclared.join(', ')}` : undefined,
  }
}
