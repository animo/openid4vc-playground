import { AGENT_HOST } from '../constants.js'
import { mobileDriversLicenseMdoc } from '../issuers/credentials/mDLMdoc.js'
import type { PlaygroundVerifierOptions } from '../verifier.js'
import { pidMdocCredential, pidSdJwtCredential } from './util.js'

export const turboKeysVerifier = {
  verifierId: 'c01ea0f3-34df-41d5-89d1-50ef3d181855',
  useCase: {
    name: 'Rent a car',
    icon: 'car-rental',
    tags: [],
  },
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/turbokeys/verifier.png`,
    client_name: 'TurboKeys',
  },
  requests: [
    {
      name: 'DE PID (sd-jwt-vc not ARF compliant, or mDOC) and MDL (mdoc)',
      purpose: 'To secure your car reservations and finalize the transaction, we require the following attributes',

      credential_sets: [[0], [1, 2]],
      credentials: [
        {
          format: 'mso_mdoc',
          doctype: mobileDriversLicenseMdoc.doctype,
          namespace: 'org.iso.18013.5.1',
          fields: [
            'document_number',
            'issue_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
            'portrait',
            'driving_privileges',
          ],
        },
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
