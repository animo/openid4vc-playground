import { anthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { z } from 'zod'

export const zValidateVerificationRequestSchema = z.object({
  verifier: z.object({
    name: z.string(),
    domain: z.string(),
  }),
  name: z.string(),
  purpose: z.string(),
  cards: z.array(
    z.object({
      name: z.string(),
      subtitle: z.string(),
      requestedAttributes: z.array(z.string()),
    })
  ),
})

const zResponseSchema = z.object({
  reason: z.string(),
  validRequest: z.enum(['yes', 'no', 'could_not_determine']),
})

export const validateVerificationRequest = async ({
  verifier,
  name,
  purpose,
  cards,
}: z.infer<typeof zValidateVerificationRequestSchema>) => {
  const rc = cards
    .map(
      (credential) =>
        `${credential.name} - ${credential.subtitle}. Requested attributes: ${credential.requestedAttributes.join(', ')}`
    )
    .join('\n')

  // Can be improved by adding a reasoning step, but that makes it quite slow
  const { object } = await generateObject({
    model: anthropic('claude-3-5-sonnet-20240620'),
    schema: zResponseSchema,
    prompt: BASE_PROMPT(verifier, name, purpose, rc),
  }).catch(() => ({ object: { validRequest: 'could_not_determine', reason: 'AI request failed' } }))

  return object
}

const BASE_PROMPT = (
  verifier: { name: string; domain: string },
  requestName: string,
  requestPurpose: string,
  requestedCards: string
) => `
You are an AI assistant tasked with analyzing data verification requests to identify potential overasking of information. Your goal is to determine if the requested data is appropriate and necessary for the stated purpose of the request.

You will be provided with the following information:

1. Verifier Name:
<verifier_name>
${verifier.name}
</verifier_name>

2. Verifier Domain:
<verifier_domain>
${verifier.domain}
</verifier_domain>

3. Request Name:
<request_name>
${requestName}
</request_name>

4. Request Purpose:
<request_purpose>
${requestPurpose}
</request_purpose>

5. Requested Cards:
<requested_cards>
${requestedCards}
</requested_cards>

Analyze the request by following these steps:

1. Carefully review the verifier and the request name and purpose.
2. Examine each requested card, including its name, subtitle, and attributes.
3. For each piece of requested information, consider whether it is necessary and appropriate for the stated purpose.
4. Identify any instances of overasking, where the requested information exceeds what is reasonably required for the purpose.

Guidelines for identifying overasking:
- Consider the sensitivity of the requested information.
- Evaluate whether less sensitive alternatives could serve the same purpose.
- Assess if the quantity of requested information is excessive for the stated purpose.
- Determine if the information request aligns with common practices for similar purposes.
- If you cannot determine whether the request is overasking, respond with "could_not_determine".

Briefly summarize whether the request appears appropriate or if there is evidence of overasking. Remember to be thorough in your analysis and provide clear, concise explanations for your assessments. If you find no evidence of overasking, state this clearly and explain why the requested information appears appropriate for the purpose.

Keep your response concise and to the point.
`
