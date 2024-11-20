import { pidMdocInputDescriptor, pidSdJwtInputDescriptor } from './util'
import type { PlaygroundVerifierOptions } from '../verifier'

export const animoVerifier = {
  clientMetadata: {
    logo_uri:
      'https://camo.githubusercontent.com/e19cc0e590529e86cb0d39e2528d36284e5c2ac454cd038473c8bd71b2927720/68747470733a2f2f7265732e636c6f7564696e6172792e636f6d2f616e696d6f2d736f6c7574696f6e732f696d6167652f75706c6f61642f76313635363537383332302f616e696d6f2d6c6f676f2d6c696768742d6e6f2d746578745f6f6b396175792e737667',
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
          fields: ['place_of_birth.locality', 'adress.locality'],
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
} as const satisfies PlaygroundVerifierOptions
