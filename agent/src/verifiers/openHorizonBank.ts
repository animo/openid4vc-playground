import { AGENT_HOST } from '../constants'
import { certificateOfResidenceSdJwt } from '../issuers/koln'
import { steuerIdSdJwt } from '../issuers/steuern'
import { healthIdSdJwt } from '../issuers/techniker'
import type { PlaygroundVerifierOptions } from '../verifier'
import { pidSdJwtInputDescriptor, sdJwtInputDescriptor } from './util'

export const openHorizonBankVerifier = {
  verifierId: '019368e8-54aa-788e-81c4-e60a59a09d87',
  useCase: {
    name: 'Open a bank account',
    icon: 'bank',
    features: ['Federation support', 'Smart AI warnings', 'multi-credentials', 'mixed-credentials'],
  },

  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/openbank.png`,
    client_name: 'Open Horizon Bank',
  },
  presentationRequests: [
    {
      id: '019368e2-a893-799b-b7a5-cfcaa07b2229',
      name: 'PID and MDL - Open an Open Horizon Bank account (sd-jwt vc)',
      purpose:
        'To open an Open Horizon Bank account, we need to verify your name, date of birth, country of residence and nationality',
      input_descriptors: [
        sdJwtInputDescriptor({
          vcts: [steuerIdSdJwt.vct],
          fields: ['tax_number', 'affiliation_country'],
        }),
        sdJwtInputDescriptor({
          vcts: [certificateOfResidenceSdJwt.vct],
          fields: ['resident_address', 'arrival_date'],
        }),
        sdJwtInputDescriptor({
          vcts: [healthIdSdJwt.vct],
          fields: ['health_insurance_id', 'affiliation_country', 'matching_institution_id'],
        }),
        pidSdJwtInputDescriptor({
          fields: ['given_name', 'family_name', 'birthdate', 'address.country', 'nationalities'],
        }),
      ],
    },
  ],
  dcqlRequests: [],
} as const satisfies PlaygroundVerifierOptions
