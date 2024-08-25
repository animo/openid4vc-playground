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
                    enum: [
                      'https://demo.pid-issuer.bundesdruckerei.de/c',
                      'https://demo.pid-issuer.bundesdruckerei.de/c1',
                      'https://demo.pid-issuer.bundesdruckerei.de/b1',
                      issuer,
                    ],
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
            purpose: 'To open a bank account we need to verify your identity.',
          },
        ],
      },
    })
  }

  return (
    <>
      <VerifyBlock
        flowName="Signed Credential (C or C') or Authenticated Channel (B') with SD-JWT"
        createRequest={createCRequest}
      />
    </>
  )
}
