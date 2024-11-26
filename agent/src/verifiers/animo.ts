import { AGENT_HOST } from '../constants'
import { steuerIdMdoc, steuerIdSdJwt } from '../issuers/steuern'
import type { PlaygroundVerifierOptions } from '../verifier'
import { mdocDcqlCredential, pidMdocInputDescriptor, pidSdJwtInputDescriptor, sdJwtDcqlCredential } from './util'

export const animoVerifier = {
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/animo/verifier.jpg`,
    client_name: 'Animo',
  },
  verifierId: 'd8662712-ee78-406c-a88c-df4ff1ed9468',
  presentationRequests: [
    {
      id: '4db74328-9e94-49bb-97b7-bbfcb2d11a06',
      name: 'PID - Name and age verification (vc+sd-jwt)',
      purpose: 'We need to verify your name and age',
      input_descriptors: [
        pidSdJwtInputDescriptor({
          fields: ['given_name', 'family_name', 'age_equal_or_over.21'],
        }),
      ],
    },
    {
      id: '1e5fe154-183c-4bf5-b2c8-caa2264f1c99',
      name: 'PID - City verification (vc+sd-jwt)',
      purpose: 'We need to verify your city',
      input_descriptors: [
        pidSdJwtInputDescriptor({
          fields: ['place_of_birth.locality', 'address.locality'],
        }),
      ],
    },
    {
      id: 'f64dc30a-bcd7-48e8-b065-2bc3c7fc9588',
      name: 'PID - Age in year and birth family name verification (vc+sd-jwt)',
      purpose: 'We need to verify your name and age',
      input_descriptors: [
        pidSdJwtInputDescriptor({
          fields: ['age_in_years', 'birth_family_name'],
        }),
      ],
    },
    {
      id: '5db54e62-d19d-495a-9d1d-58fac1f89a4d',
      name: 'PID - Name and age verification (mso_mdoc)',
      purpose: 'We need to verify your name and age',
      input_descriptors: [
        pidMdocInputDescriptor({
          fields: ['given_name', 'family_name', 'age_over_21'],
        }),
      ],
    },
    {
      id: '8e80930c-6110-407a-a415-04791be81a35',
      name: 'PID - City verification (mso_mdoc)',
      purpose: 'We need to verify your city',
      input_descriptors: [
        pidMdocInputDescriptor({
          fields: ['birth_place', 'resident_city', 'birth_date'],
        }),
      ],
    },
    {
      id: '7df77c25-01bb-47ac-8778-454cb1031fe5',
      name: 'PID - Age in year and birth family name verification (mso_mdoc)',
      purpose: 'We need to verify your name and age',
      input_descriptors: [
        pidMdocInputDescriptor({
          fields: ['age_in_years', 'family_name_birth'],
        }),
      ],
    },
  ],
  dcqlRequests: [
    {
      id: '6a93d69f-b1d5-4f21-b1d4-a2cc102b2341',
      name: 'Steuer ID two formats (vc+sd-jwt/mso_mdoc)',
      credentials: [
        mdocDcqlCredential({
          doctype: steuerIdMdoc.doctype,
          namespace: 'eu.europa.ec.eudi.hiid.1',
          fields: ['resident_address', 'issuance_date'],
        }),
        sdJwtDcqlCredential({
          vcts: [steuerIdSdJwt.vct],
          fields: ['credential_type', 'resident_address', 'birth_date'],
        }),
      ],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
