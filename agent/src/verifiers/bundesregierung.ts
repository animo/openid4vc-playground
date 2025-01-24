import { AGENT_HOST } from '../constants'
import { taxIdMdoc, taxIdSdJwt } from '../issuers/steuern'
import type { PlaygroundVerifierOptions } from '../verifier'
import { mdocDcqlCredential, pidMdocInputDescriptor, sdJwtDcqlCredential } from './util'
import { pidSdJwtInputDescriptor } from './util'

export const bundesregierungVerifier = {
  verifierId: '019368ed-3787-7669-b7f4-8c012238e90d',
  useCase: {
    name: 'Government identification',
    icon: 'government',
    tags: ['PID', 'Present Multiple Credentials', 'mixed-credentials', 'Query languages', 'Federation support'],
  },

  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/bunde.png`,
    client_name: 'Die Bundesregierung',
  },
  presentationRequests: [
    {
      id: '4db74328-9e94-49bb-97b7-bbfcb2d11a06',
      name: 'PID - Name and age verification (sd-jwt vc)',
      purpose: 'We need to verify your name and age',
      input_descriptors: [
        pidSdJwtInputDescriptor({
          fields: ['given_name', 'family_name', 'age_equal_or_over.21'],
        }),
      ],
    },
    {
      id: '1e5fe154-183c-4bf5-b2c8-caa2264f1c99',
      name: 'PID - City verification (sd-jwt vc)',
      purpose: 'We need to verify your city',
      input_descriptors: [
        pidSdJwtInputDescriptor({
          fields: ['place_of_birth.locality', 'address.locality'],
        }),
      ],
    },
    {
      id: 'f64dc30a-bcd7-48e8-b065-2bc3c7fc9588',
      name: 'PID - Age in year and birth family name verification (sd-jwt vc)',
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
      name: 'Tax-ID two formats (in both sd-jwt vc and mso_mdoc)',
      credential_sets: [
        {
          options: [['01936a55-560e-7aae-9bde-562848e741cf', '01936a54-da89-700c-936d-ad8545379910']],
          purpose: 'We need to verify your tax number and address',
        },
      ],
      credentials: [
        mdocDcqlCredential({
          id: '01936a55-560e-7aae-9bde-562848e741cf',
          doctype: taxIdMdoc.doctype,
          namespace: taxIdMdoc.doctype,
          fields: ['resident_address', 'issuance_date'],
        }),
        sdJwtDcqlCredential({
          id: '01936a54-da89-700c-936d-ad8545379910',
          vcts: [taxIdSdJwt.vct],
          fields: ['credential_type', 'resident_address', 'birth_date'],
        }),
      ],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
