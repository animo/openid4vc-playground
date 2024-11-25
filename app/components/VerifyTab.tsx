import { createRequest } from '../lib/api'
import { type ResponseMode, VerifyBlock } from './VerifyBlock'

export function VerifyTab() {
  const createRequestForVerification = async (options: {
    presentationDefinitionId: string
    requestScheme: string
    responseMode: ResponseMode
  }) => {
    return await createRequest({
      requestScheme: options.requestScheme,
      presentationDefinitionId: options.presentationDefinitionId,
      responseMode: options.responseMode,
    })
  }

  return <VerifyBlock flowName="Verify" createRequest={createRequestForVerification} />
}
