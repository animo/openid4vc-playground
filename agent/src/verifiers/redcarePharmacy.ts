import { AGENT_HOST } from '../constants'
import { healthIdSdJwt } from '../issuers/krankenkasse'
import type { PlaygroundVerifierOptions } from '../verifier'
import { legacyDePidSdJwtCredential } from './util'

export const redcarePharmacyVerifier = {
  verifierId: '01936901-2390-722e-b9f1-bf42db4db7ca',
  useCase: {
    name: 'Get an ePrescription',
    icon: 'health',
    tags: [],
  },
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/redcare.png`,
    client_name: 'Redcare Pharmacy',
  },

  requests: [
    {
      name: 'Verify Health ID (sd-jwt vc)',
      purpose: 'To receive your prescription and finalize the transaction, we require the following attributes',
      credentials: [
        {
          format: 'dc+sd-jwt',
          vcts: [healthIdSdJwt.vct],
          fields: ['health_insurance_id', 'affiliation_country'],
        },
      ],
    },
    {
      name: 'Verify DE PID (not ARF compliant) and Health-ID (sd-jwt vc)',
      purpose: 'To give your medicine we need to verify your identity and prescription.',
      credentials: [
        legacyDePidSdJwtCredential({
          fields: ['given_name', 'family_name', 'birthdate'],
        }),
        {
          format: 'dc+sd-jwt',
          vcts: [healthIdSdJwt.vct],
          fields: ['health_insurance_id', 'wallet_e_prescription_code'],
        },
      ],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
