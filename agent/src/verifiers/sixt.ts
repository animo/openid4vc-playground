import { AGENT_HOST } from '../constants'
import { mobileDriversLicenseMdoc, mobileDriversLicenseSdJwt } from '../issuers/infrastruktur'
import type { PlaygroundVerifierOptions } from '../verifier'
import {
  mdocDcqlCredential,
  mdocInputDescriptor,
  pidMdocDcqlCredential,
  pidSdJwtDcqlCredential,
  pidSdJwtInputDescriptor,
  sdJwtDcqlCredential,
  sdJwtInputDescriptor,
} from './util'

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
          namespace: 'org.iso.18013.5.1',
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
  dcqlRequests: [
    {
      id: 'dc195d0e-114d-41d1-8803-e1ad08041dca',
      name: 'PID and MDL - Rent a Car (vc+sd-jwt)',
      credentials: [
        sdJwtDcqlCredential({
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
        pidSdJwtDcqlCredential({
          fields: ['given_name', 'family_name', 'birthdate'],
        }),
      ],
    },
    {
      id: 'a2a7aa98-5fff-4e6a-abb1-e8aa7c3adf9b',
      name: 'PID and MDL - Rent a Car (vc+sd-jwt/mso_mdoc)',
      credentials: [
        mdocDcqlCredential({
          doctype: mobileDriversLicenseMdoc.doctype,
          namespace: 'org.iso.18013.5.1',
          fields: [
            'document_number',
            'issue_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
            'driving_priviliges',
          ],
        }),
        pidSdJwtDcqlCredential({
          fields: ['given_name', 'family_name', 'birthdate'],
        }),
      ],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
