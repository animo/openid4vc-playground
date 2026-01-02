import { AGENT_HOST } from '../constants'
import type { PlaygroundVerifierOptions } from '../verifier'
import { mdlMdocCredential, pidMdocCredential, pidSdJwtCredential } from './util'

export const turboKeysVerifier = {
  verifierId: 'c01ea0f3-34df-41d5-89d1-50ef3d181855',
  useCase: {
    name: 'Rent a car',
    icon: 'car-rental',
    tags: ['multi-credentials', 'mixed-credentials', 'Query languages', 'Federation support'],
  },
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/turbokeys/verifier.png`,
    client_name: 'TurboKeys',
  },
  requests: [
    {
      name: 'PID (sd-jwt vc) and MDL (mso_mdoc)',
      purpose: 'To secure your car reservations and finalize the transaction, we require the following attributes',
      credentials: [
        mdlMdocCredential({
          fields: [
            'document_number',
            'issue_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
            'driving_privileges',
          ],
        }),
        pidSdJwtCredential({
          fields: ['given_name', 'family_name', 'birthdate'],
        }),
      ],
    },
    {
      name: 'PID and MDL (PID either sd-jwt vc or mso_mdoc, prefer sd-jwt vc)',
      purpose: 'To secure your car reservations and finalize the transaction, we require the following attributes',

      credential_sets: [[0], [1, 2]],
      credentials: [
        mdlMdocCredential({
          fields: [
            'document_number',
            'issue_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
            'portrait',
            'driving_privileges',
          ],
        }),
        pidSdJwtCredential({
          fields: ['given_name', 'family_name', 'birthdate'],
        }),
        pidMdocCredential({
          fields: ['given_name', 'family_name', 'birth_date'],
        }),
      ],
    },
    {
      name: 'PID and MDL (PID either sd-jwt vc or mso_mdoc, prefer mdoc)',
      purpose: 'To secure your car reservations and finalize the transaction, we require the following attributes',
      credential_sets: [[0], [2, 1]],
      credentials: [
        mdlMdocCredential({
          fields: [
            'document_number',
            'issue_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
            'portrait',
            'driving_privileges',
          ],
        }),
        pidSdJwtCredential({
          fields: ['given_name', 'family_name', 'birthdate'],
        }),
        pidMdocCredential({
          fields: ['given_name', 'family_name', 'birth_date'],
        }),
      ],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
