import { createRequest } from '../lib/api'
import { VerifyBlock } from './VerifyBlock'

export type CreateRequestOptions = Parameters<typeof createRequest>[0]
export type CreateRequestResponse = Awaited<ReturnType<typeof createRequest>>

export function VerifyTab() {
  return <VerifyBlock flowName="Verify" createRequest={createRequest} />
}
