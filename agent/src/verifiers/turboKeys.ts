import { AGENT_HOST } from '../constants'
import { mobileDriversLicenseMdoc, mobileDriversLicenseSdJwt } from '../issuers/bdr'
import type { PlaygroundVerifierOptions } from '../verifier'
import { pidMdocCredential, pidSdJwtCredential } from './util'

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
      name: 'PID and MDL (sd-jwt vc)',
      purpose: 'To secure your car reservations and finalize the transaction, we require the following attributes',
      credentials: [
        {
          vcts: [mobileDriversLicenseSdJwt.vct],
          fields: [
            'document_number',
            'portrait',
            'issue_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
            'driving_privileges',
          ],
          format: 'dc+sd-jwt',
        },
        pidSdJwtCredential({
          fields: ['given_name', 'family_name', 'birthdate'],
        }),
      ],
    },
    {
      name: 'PID (sd-jwt vc) and MDL (mso_mdoc)',
      purpose: 'To secure your car reservations and finalize the transaction, we require the following attributes',
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
            'driving_privileges',
          ],
        },
        pidSdJwtCredential({
          fields: ['given_name', 'family_name', 'birthdate'],
        }),
      ],
    },
    {
      name: 'PID and MDL (both either sd-jwt vc or mso_mdoc, prefer sd-jwt vc)',
      purpose: 'To secure your car reservations and finalize the transaction, we require the following attributes',

      credential_sets: [
        [1, 0],
        [2, 3],
      ],
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
        {
          format: 'dc+sd-jwt',
          vcts: [mobileDriversLicenseSdJwt.vct],
          fields: [
            'document_number',
            'portrait',
            'issue_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
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
    {
      name: 'PID and MDL (both either sd-jwt vc or mso_mdoc, prefer mdoc)',
      purpose: 'To secure your car reservations and finalize the transaction, we require the following attributes',
      credential_sets: [
        [0, 1],
        [3, 2],
      ],
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
        {
          format: 'dc+sd-jwt',
          vcts: [mobileDriversLicenseSdJwt.vct],
          fields: [
            'document_number',
            'portrait',
            'issue_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
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
