import { mobileDriversLicenseMdoc, mobileDriversLicenseSdJwt } from '../issuers/infrastruktur'
import { mdocInputDescriptor, pidSdJwtInputDescriptor, sdJwtInputDescriptor } from './util'
import type { PlaygroundVerifierOptions } from '../verifier'
import { AGENT_HOST } from '../constants'

export const sixtVerifier = {
  verifierId: 'c01ea0f3-34df-41d5-89d1-50ef3d181855',
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/sixt/verifier.png`,
    client_name: 'Sixt - Rent a Car',
  },
  presentationRequests: [
    {
      id: '1ad8ea6e-ec51-4e14-b316-dd76a6275480',
      name: 'PID and MDL - Rent a Car (vc+sd-jwt)',
      purpose: 'To secure your car reservations and finalize the transaction, we require the following attributes',
      input_descriptors: [
        sdJwtInputDescriptor({
          vcts: [mobileDriversLicenseSdJwt.vct],
          fields: [
            'document_number',
            'portrait',
            'issue_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
            'driving_priviliges',
          ],
        }),
        pidSdJwtInputDescriptor({
          fields: ['given_name', 'family_name', 'birthdate'],
        }),
      ],
    },
    {
      id: '479ada7f-fff1-4f4a-ba0b-f0e7a8dbab04',
      name: 'PID and MDL - Rent a Car (vc+sd-jwt/mso_mdoc)',
      purpose: 'To secure your car reservations and finalize the transaction, we require the following attributes',
      input_descriptors: [
        mdocInputDescriptor({
          doctype: mobileDriversLicenseMdoc.doctype,
          namespace: mobileDriversLicenseMdoc.doctype,
          fields: [
            'document_number',
            'issue_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
            'driving_priviliges',
          ],
        }),
        pidSdJwtInputDescriptor({
          fields: ['given_name', 'family_name', 'birthdate'],
        }),
      ],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
