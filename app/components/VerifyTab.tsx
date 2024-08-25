import { createRequest, getIssuer } from '../lib/api'
import { VerifyBlock } from './VerifyBlock'

export function VerifyTab() {
  const createCRequest = async () => {
    const issuer = (await getIssuer()).availableX509Certificates[0]
    return await createRequest({
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
                {
                  path: ['$.family_name'],
                },
                {
                  path: ['$.age_equal_or_over.21'],
                  filter: {
                    type: 'boolean',
                    const: true,
                  },
                },
                {
                  path: ['$.nationalities'],
                },
                {
                  path: ['$.iss'],
                  filter: {
                    type: 'string',
                    enum: ['https://demo.pid-issuer.bundesdruckerei.de/c','https://demo.pid-issuer.bundesdruckerei.de/c1', issuer],
                  },
                },
                {
                  path: ['$.vct'],
                  filter: {
                    type: 'string',
                    enum: ['https://example.bmi.bund.de/credential/pid/1.0', 'urn:eu.europa.ec.eudi:pid:1'],
                  },
                },
              ],
            },
            name: 'PID Name',
            purpose: 'Verify your name',
          },
        ],
      },
      flow: 'c'
    })
  }

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
      flow: 'b'' 
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
