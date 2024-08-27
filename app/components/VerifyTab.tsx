import { useEffect, useState } from 'react'
import { createRequest, getIssuer, getX509Certificate } from '../lib/api'
import { type CredentialType, type RequestType, VerifyBlock } from './VerifyBlock'

export function VerifyTab() {
  const [x509Certificate, setX509Certificate] = useState<string>()

  const createRequestForVerification = async (options: {
    credentialType: CredentialType
    requestType: RequestType
  }) => {
    const issuer = (await getIssuer()).availableX509Certificates[0]
    return await createRequest({
      presentationDefinition:
        options.credentialType === 'sdjwt'
          ? getSdJwtPresentationDefinition(issuer, options.requestType)
          : getMdocPresentationDefinition(options.requestType),
    })
  }

  useEffect(() => {
    getX509Certificate().then(({ certificate }) => setX509Certificate(certificate))
  }, [])

  return (
    <>
      <VerifyBlock flowName="Verify" createRequest={createRequestForVerification} x509Certificate={x509Certificate} />
    </>
  )
}

const getSdJwtPresentationDefinition = (issuer: string, requestType: RequestType) => {
  const typeFieldsMapping = {
    name_age_over_21: [
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
    ],
    city: [
      {
        path: ['$.place_of_birth.locality'],
      },
      {
        path: ['$.address.locality'],
      },
    ],
    age_birth_family_name: [
      {
        path: ['$.age_in_years'],
      },
      {
        path: ['$.birth_family_name'],
      },
    ],
  }

  return {
    id: crypto.randomUUID(),
    name: 'Bank account identity verification',
    purpose: 'To open a bank account we need to verify your identity.',
    input_descriptors: [
      {
        id: crypto.randomUUID(),
        constraints: {
          limit_disclosure: 'required',
          fields: [
            ...typeFieldsMapping[requestType],
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
        name: 'Bank Account Identity Verification',
        purpose: 'To open a bank account we need to verify your identity.',
      },
    ],
  }
}

const getMdocPresentationDefinition = (requestType: RequestType) => {
  const typeFieldsMapping = {
    name_age_over_21: [
      {
        path: ["$['eu.europa.ec.eudi.pid.1']['given_name']"],
        intent_to_retain: false,
      },
      {
        path: ["$['eu.europa.ec.eudi.pid.1']['family_name']"],
        intent_to_retain: false,
      },
      {
        path: ["$['eu.europa.ec.eudi.pid.1']['age_over_21']"],
        intent_to_retain: false,
      },
    ],
    city: [
      {
        path: ["$['eu.europa.ec.eudi.pid.1']['birth_place']"],
        intent_to_retain: false,
      },
      {
        path: ["$['eu.europa.ec.eudi.pid.1']['resident_city']"],
        intent_to_retain: false,
      },
    ],
    age_birth_family_name: [
      {
        path: ["$['eu.europa.ec.eudi.pid.1']['age_in_years']"],
        intent_to_retain: false,
      },
      {
        path: ["$['eu.europa.ec.eudi.pid.1']['family_name_birth']"],
        intent_to_retain: false,
      },
    ],
  }

  return {
    id: crypto.randomUUID(),
    name: 'Bank account identity verification',
    purpose: 'To open a bank account we need to verify your identity.',
    input_descriptors: [
      {
        id: 'eu.europa.ec.eudi.pid.1',
        format: {
          mso_mdoc: {
            alg: ['ES256', 'ES384', 'ES512', 'EdDSA'],
          },
        },
        constraints: {
          fields: [...typeFieldsMapping[requestType]],
          limit_disclosure: 'required',
        },
        name: 'Bank Account Identity Verification',
        purpose: 'To open a bank account we need to verify your identity.',
      },
    ],
  }
}
