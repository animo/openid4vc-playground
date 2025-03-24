import { AGENT_HOST } from '../constants'
import { certificateOfResidenceSdJwt } from '../issuers/koln'
import { healthIdSdJwt } from '../issuers/krankenkasse'
import { taxIdSdJwt } from '../issuers/steuern'
import type { PlaygroundVerifierOptions } from '../verifier'
import { pidSdJwtCredential } from './util'

export const openHorizonBankVerifier = {
  verifierId: '019368e8-54aa-788e-81c4-e60a59a09d87',
  useCase: {
    name: 'Open a bank account',
    icon: 'bank',
    tags: ['Federation support', 'Smart AI warnings', 'multi-credentials', 'mixed-credentials'],
  },

  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/openbank.png`,
    client_name: 'Open Horizon Bank',
  },
  requests: [
    {
      name: 'PID and MDL - Open an Open Horizon Bank account (sd-jwt vc)',
      purpose:
        'To open an Open Horizon Bank account, we need to verify your name, date of birth, country of residence and nationality',
      credentials: [
        { format: 'dc+sd-jwt', vcts: [taxIdSdJwt.vct], fields: ['tax_number', 'affiliation_country'] },
        { format: 'dc+sd-jwt', vcts: [certificateOfResidenceSdJwt.vct], fields: ['resident_address', 'arrival_date'] },
        {
          format: 'dc+sd-jwt',
          vcts: [healthIdSdJwt.vct],
          fields: ['health_insurance_id', 'affiliation_country', 'matching_institution_id'],
        },
        pidSdJwtCredential({
          fields: ['given_name', 'family_name', 'birthdate', 'address.country', 'nationalities'],
        }),
      ],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
