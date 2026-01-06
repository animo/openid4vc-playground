import { AGENT_HOST } from '../constants.js'
import { certificateOfResidenceSdJwt } from '../issuers/koln.js'
import { healthIdSdJwt } from '../issuers/krankenkasse.js'
import { taxIdSdJwt } from '../issuers/steuern.js'
import type { PlaygroundVerifierOptions } from '../verifier.js'
import { pidSdJwtCredential } from './util.js'

export const openHorizonBankVerifier = {
  verifierId: '019368e8-54aa-788e-81c4-e60a59a09d87',
  useCase: {
    name: 'Open a bank account',
    icon: 'bank',
    tags: [],
  },

  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/openbank.png`,
    client_name: 'Open Horizon Bank',
  },
  requests: [
    {
      name: 'DE PID (not ARF compliant), MDL (sd-jwt vc), Tax ID, and Certificate of Residence',
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
