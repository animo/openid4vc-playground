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

  const prompt = BASE_PROMPT(verifier, name, purpose, rc)

  // Can be improved by adding a reasoning step, but that makes it quite slow
  const { object } = await generateObject({
    model: anthropic('claude-3-7-sonnet-20250219'),
    schema: zResponseSchema,
    prompt,
  }).catch((e) => {
    console.error(e)
    return { object: { validRequest: 'could_not_determine', reason: 'AI request failed' } }
  })

  console.log('AI:::', JSON.stringify(object, null, 2))

  return object
}

const BASE_PROMPT = (
  verifier: { name: string; domain: string },
  requestName: string,
  requestPurpose: string,
  requestedCards: string
) => {
  const hasRequestName = requestName !== 'No name provided'

  return `
You are an AI assistant tasked with analyzing data verification requests to identify potential overasking of information. Your goal is to determine if the requested data is appropriate and necessary for the stated purpose of the request.

You will be provided with the following information:

Verifier Name:
<verifier_name>
${verifier.name}
</verifier_name>

Verifier Domain:
<verifier_domain>
${verifier.domain}
</verifier_domain>

${
  hasRequestName
    ? `
Request Name:
<request_name>
${requestName}
</request_name>
`
    : ''
}

Request Purpose:
<request_purpose>
${requestPurpose}
</request_purpose>

Requested Cards:
<requested_cards>
${requestedCards}
</requested_cards>

Analyze the request by following these steps:

1. Carefully review the verifier ${hasRequestName ? 'and the request name' : ''} and purpose.
2. Examine each requested card, including its name, subtitle, and attributes.
3. For each piece of requested information, consider whether it is necessary and appropriate for the stated purpose.
4. Identify any instances of overasking of personal information, where the requested information exceeds what is reasonably required for the purpose.

Guidelines for identifying overasking:
- Consider only if overasking of sensitive personal information is the case. Overasking of common info such as the name or portrait of the person, or metadata related to the card such as date of issuance or expiration should not be a reason to reject the request.
- Asking the same information from different cards should not be considered overasking.
- Assess if the requested information is excessive for the stated purpose.
- Determine if the information request aligns with common practices for similar purposes in the real world.
- If you cannot determine whether the request is overasking, respond with "could_not_determine".

Briefly summarize whether the request appears appropriate or if there is evidence of overasking. Remember to be thorough in your analysis and provide clear, concise explanations for your assessments. If you find no evidence of overasking, state this clearly and explain why the requested information appears appropriate for the purpose.

Keep your response concise and to the point.
`
}
