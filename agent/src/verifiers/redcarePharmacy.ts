import { AGENT_HOST } from '../constants'
import { healthIdSdJwt } from '../issuers/krankenkasse'
import type { PlaygroundVerifierOptions } from '../verifier'
import { pidSdJwtDcqlCredential, sdJwtDcqlCredential, sdJwtInputDescriptor } from './util'

export const redcarePharmacyVerifier = {
  verifierId: '01936901-2390-722e-b9f1-bf42db4db7ca',
  useCase: {
    name: 'Get an ePrescription',
    icon: 'health',
    tags: ['Federation support', 'QEAA', 'DCQL'],
  },
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/redcare.png`,
    client_name: 'Redcare Pharmacy',
  },
  presentationRequests: [
    {
      id: '01936901-3823-766e-b771-301158d79a60',
      name: 'Receive your prescription (sd-jwt vc)',
      purpose: 'To receive your prescription and finalize the transaction, we require the following attributes',
      input_descriptors: [
        sdJwtInputDescriptor({
          vcts: [healthIdSdJwt.vct],
          fields: ['health_insurance_id', 'affiliation_country'],
        }),
      ],
    },
  ],
  dcqlRequests: [
    {
      id: '208f84b4-76b4-4786-bbef-f4e483e5bed0',
      name: 'PID and Health-ID (sd-jwt vc)',
      credential_sets: [
        {
          purpose: 'To give your medicine we need to verify your identity and prescription.',
          options: [['pid_sd_jwt', 'health_id_sd_jwt']],
        },
      ],
      credentials: [
        pidSdJwtDcqlCredential({
          fields: ['given_name', 'family_name', 'birthdate'],
          id: 'pid_sd_jwt',
        }),
        sdJwtDcqlCredential({
          id: 'health_id_sd_jwt',
          vcts: [healthIdSdJwt.vct],
          fields: ['health_insurance_id', 'wallet_e_prescription_code'],
        }),
      ],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
