import { createRequest } from '../lib/api'
import { VerifyBlock } from './VerifyBlock'

export function VerifyTab() {
  const createCRequest = () =>
    createRequest({
      presentationDefinition: {
        id: crypto.randomUUID(),
        name: 'PID Credential request for C',
        input_descriptors: [
          {
            id: crypto.randomUUID(),
            constraints: {
              limit_disclosure: 'preferred',
              fields: [
                {
                  path: ['$.given_name'],
                },
              ],
            },
            name: 'PID Name',
            purpose: 'Verify your name',
          },
        ],
      },
    })

  const createBPrimeRequest = () =>
    createRequest({
      presentationDefinition: {
        id: crypto.randomUUID(),
        name: "PID Credential request for B'",
        input_descriptors: [
          {
            id: crypto.randomUUID(),
            constraints: {
              limit_disclosure: 'preferred',
              fields: [
                {
                  path: ['$.given_name'],
                },
              ],
            },
            name: 'PID Name',
            purpose: 'Verify your name',
          },
        ],
      },
    })

  return (
    <>
      <VerifyBlock
        flowName="Signed Credential in generic flow (C) with SD-JWT and mDoc"
        createRequest={createCRequest}
      />
      <div style={{ height: '20px' }} />
      <VerifyBlock
        flowName="Authenticated Channel with Cloud Support (B') with SD-JWT and mDoc"
        createRequest={createBPrimeRequest}
      />
    </>
  )
}
