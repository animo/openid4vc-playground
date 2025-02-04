import { AGENT_HOST } from '../constants'
import { mobileDriversLicenseMdoc, mobileDriversLicenseSdJwt } from '../issuers/bdr'
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
  presentationRequests: [
    {
      id: '1ad8ea6e-ec51-4e14-b316-dd76a6275480',
      name: 'PID and MDL (sd-jwt vc)',
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
            // Sphereon library can't parse our maps
            // 'driving_privileges',
          ],
        }),
        pidSdJwtInputDescriptor({
          fields: ['given_name', 'family_name', 'birthdate'],
        }),
      ],
    },
    {
      id: '479ada7f-fff1-4f4a-ba0b-f0e7a8dbab04',
      name: 'PID (sd-jwt vc) and MDL (mdoc)',
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
            // Sphereon library can't parse our maps
            // 'driving_privileges',
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
      name: 'PID and MDL (sd-jwt vc)',
      credential_sets: [
        {
          options: [['01936a3d-b6a4-7771-b0a0-979f01a97dda', '01936a3d-5904-766d-b9bb-705040408ea1']],
          purpose: 'To secure your car reservations and finalize the transaction, we require the following attributes',
        },
      ],
      credentials: [
        sdJwtDcqlCredential({
          id: '01936a3d-b6a4-7771-b0a0-979f01a97dda',
          vcts: [mobileDriversLicenseSdJwt.vct],
          fields: [
            'document_number',
            'portrait',
            'issue_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
            // Sphereon library can't parse our maps
            // 'driving_privileges',
          ],
        }),
        pidSdJwtDcqlCredential({
          id: '01936a3d-5904-766d-b9bb-705040408ea1',
          fields: ['given_name', 'family_name', 'birthdate'],
        }),
      ],
    },
    {
      id: 'a2a7aa98-5fff-4e6a-abb1-e8aa7c3adf9b',
      name: 'PID (sd-jwt vc) and MDL (mso_mdoc)',
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
            // Sphereon library can't parse our maps
            // 'driving_privileges',
          ],
        }),
        pidSdJwtDcqlCredential({
          fields: ['given_name', 'family_name', 'birthdate'],
        }),
      ],
    },
    {
      id: '0679b1e0-1e9d-45d1-ab19-ab6954d7e32c',
      name: 'PID and MDL (both either sd-jwt vc or mso_mdoc, prefer sd-jwt vc)',
      credential_sets: [
        {
          purpose: 'To secure your car reservations and finalize the transaction, we require the following attributes',
          options: [['pid_sd_jwt'], ['pid_mdoc']],
        },
        {
          purpose: 'To secure your car reservations and finalize the transaction, we require the following attributes',
          options: [['mdl_sd_jwt'], ['mdl_mdoc']],
        },
      ],
      credentials: [
        mdocDcqlCredential({
          id: 'mdl_mdoc',
          doctype: mobileDriversLicenseMdoc.doctype,
          namespace: 'org.iso.18013.5.1',
          fields: [
            'document_number',
            'issue_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
            'portrait',
            // Sphereon library can't parse our maps
            // 'driving_privileges',
          ],
        }),
        sdJwtDcqlCredential({
          id: 'mdl_sd_jwt',
          vcts: [mobileDriversLicenseSdJwt.vct],
          fields: [
            'document_number',
            'portrait',
            'issue_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
            // Sphereon library can't parse our maps
            // 'driving_privileges',
          ],
        }),
        pidSdJwtDcqlCredential({
          id: 'pid_sd_jwt',
          fields: ['given_name', 'family_name', 'birthdate'],
        }),
        pidMdocDcqlCredential({
          id: 'pid_mdoc',
          fields: ['given_name', 'family_name', 'birth_date'],
        }),
      ],
    },
    {
      id: 'be06eb91-4d83-496e-9a72-328deb05ae25',
      name: 'PID and MDL (both either sd-jwt vc or mso_mdoc, prefer mdoc)',
      credential_sets: [
        {
          purpose: 'To secure your car reservations and finalize the transaction, we require the following attributes',
          options: [['pid_mdoc'], ['pid_sd_jwt']],
        },
        {
          purpose: 'To secure your car reservations and finalize the transaction, we require the following attributes',
          options: [['mdl_mdoc'], ['mdl_sd_jwt']],
        },
      ],
      credentials: [
        mdocDcqlCredential({
          id: 'mdl_mdoc',
          doctype: mobileDriversLicenseMdoc.doctype,
          namespace: 'org.iso.18013.5.1',
          fields: [
            'document_number',
            'issue_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
            'portrait',
            // Sphereon library can't parse our maps
            // 'driving_privileges',
          ],
        }),
        sdJwtDcqlCredential({
          id: 'mdl_sd_jwt',
          vcts: [mobileDriversLicenseSdJwt.vct],
          fields: [
            'document_number',
            'portrait',
            'issue_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
            // Sphereon library can't parse our maps
            // 'driving_privileges',
          ],
        }),
        pidSdJwtDcqlCredential({
          id: 'pid_sd_jwt',
          fields: ['given_name', 'family_name', 'birthdate'],
        }),
        pidMdocDcqlCredential({
          id: 'pid_mdoc',
          fields: ['given_name', 'family_name', 'birth_date'],
        }),
      ],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
