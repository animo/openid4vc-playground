import { URN_SCA_GENERIC } from '@animo-id/eudi-wallet-functionality'
import { AGENT_HOST } from '../constants.js'
import { certificateOfResidenceSdJwt } from '../issuers/koln.js'
import { healthIdSdJwt } from '../issuers/krankenkasse.js'
import { taxIdSdJwt } from '../issuers/steuern.js'
import type { PlaygroundVerifierOptions } from '../verifier.js'
import { pidSdJwtCredential } from './util.js'

const issuerId = '7cc028a3-8ce2-432a-bf19-5621068586df'
const bankAccountScaVct = `${AGENT_HOST}/api/vct/${issuerId}/${encodeURI('openid4vc:credential:BankAccountSca')}`

export const openHorizonBankVerifier = {
  verifierId: '019368e8-54aa-788e-81c4-e60a59a09d87',
  useCase: {
    name: 'Bank account operations',
    icon: 'bank',
    tags: [],
  },

  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/openbank.png`,
    client_name: 'Open Horizon Bank',
  },
  requests: [
    {
      name: 'Open bank account: DE PID (not ARF compliant), MDL (sd-jwt vc), Tax ID, and Certificate of Residence',
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
    {
      name: 'Login to Open Horizon Bank: SCA',
      purpose: 'Login to your Open Horizon Bank account using your Bank Account credential',
      credentials: [
        {
          format: 'dc+sd-jwt',
          vcts: [bankAccountScaVct],
          fields: ['account_holder_id', 'account_id'],
        },
      ],
      transaction_data: [
        {
          type: URN_SCA_GENERIC,
          subtype: 'login',
          credential_ids: ['0'],
          payload: {
            transaction_id: '12345678-1234-1234-1234-123456789012',
            service: 'Open Horizon Bank',
            ip_address: '192.168.1.1',
          },
        },
      ],
    },
    {
      name: 'Increase Spending Limit: SCA',
      purpose: 'Increase your spending limit using your Bank Account credential',
      credentials: [
        {
          format: 'dc+sd-jwt',
          vcts: [bankAccountScaVct],
          fields: ['account_holder_id', 'account_id'],
        },
      ],
      transaction_data: [
        {
          type: URN_SCA_GENERIC,
          subtype: 'increase_spending_limit',
          credential_ids: ['0'],
          payload: {
            transaction_id: '87654321-4321-4321-4321-210987654321',
            old_spending_limit: '€1000',
            new_spending_limit: '€5000',
          },
        },
      ],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
