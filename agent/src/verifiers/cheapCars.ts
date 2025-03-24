import { AGENT_HOST } from '../constants'
import { mobileDriversLicenseSdJwt } from '../issuers/bdr'
import type { PlaygroundVerifierOptions } from '../verifier'
import { pidSdJwtCredential } from './util'

export const cheapCarsVerifier = {
  verifierId: '019368fe-ee82-7990-880c-7f0ceb92b0aa',
  useCase: {
    name: 'Rent a car',
    icon: 'car-rental',
    tags: ['multi-credentials', 'mixed-credentials', 'Query languages', 'Federation support'],
  },

  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/cheap-cars.webp`,
    client_name: 'Cheap Cars',
  },
  requests: [
    {
      name: 'PID and MDL (sd-jwt vc) - Not trust anchor - AI over asking',
      purpose: 'To secure your car reservations and finalize the transaction, we require the following attributes',
      credentials: [
        {
          format: 'dc+sd-jwt',
          vcts: [mobileDriversLicenseSdJwt.vct],
          fields: ['document_number', 'portrait', 'issue_date', 'expiry_date', 'issuing_country', 'issuing_authority'],
        },
        pidSdJwtCredential({
          fields: ['given_name', 'family_name', 'birthdate', 'address.country', 'nationalities'],
        }),
      ],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
