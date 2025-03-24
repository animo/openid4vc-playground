import { AGENT_HOST } from '../constants'
import { arfCompliantPidSdJwt, mobileDriversLicenseMdoc } from '../issuers/bdr'
import { taxIdMdoc, taxIdSdJwt } from '../issuers/steuern'
import type { PlaygroundVerifierOptions } from '../verifier'
import { pidMdocCredential, pidSdJwtCredential } from './util'

export const bundesregierungVerifier = {
  verifierId: '019368ed-3787-7669-b7f4-8c012238e90d',
  useCase: {
    name: 'Government identification',
    icon: 'government',
    tags: ['PID', 'Present Multiple Credentials', 'mixed-credentials', 'Query languages', 'Federation support'],
  },

  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/bunde.png`,
    client_name: 'Die Bundesregierung',
  },

  requests: [
    {
      name: 'MDL (mdoc)',
      purpose: 'Authorize to the government using your mobile drivers license',
      credentials: [
        {
          format: 'mso_mdoc',
          doctype: mobileDriversLicenseMdoc.doctype,
          namespace: 'org.iso.18013.5.1',
          fields: [
            'given_name',
            'family_name',
            'birth_date',
            'document_number',
            'issue_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
            'driving_privileges',
          ],
        },
      ],
    },
    {
      name: 'Tax-ID two formats (in both sd-jwt vc and mso_mdoc)',
      purpose: 'We need to verify your tax number and address',
      credentials: [
        {
          format: 'mso_mdoc',
          doctype: taxIdMdoc.doctype,
          namespace: taxIdMdoc.doctype,
          fields: ['resident_address', 'issuance_date'],
        },
        {
          format: 'dc+sd-jwt',
          vcts: [taxIdSdJwt.vct],
          fields: ['credential_type', 'resident_address', 'birth_date'],
        },
      ],
    },
    {
      name: 'ARF PID (sd-jwt vc) - Most',
      purpose: 'To grant you access we need to verify your ARF compliant PID',
      credentials: [
        {
          format: 'dc+sd-jwt',
          vcts: [arfCompliantPidSdJwt.vct],
          fields: [
            // Mandatory
            'family_name',
            'given_name',
            'birth_date',
            'age_over_18',

            // Mandatory metadata
            'issuance_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',

            // Optional
            'age_over_12',
            'age_over_14',
            'age_over_16',
            'age_over_21',
            'age_over_65',
            'age_in_years',
            'age_birth_year',
            'family_name_birth',
            'birth_city',
            'resident_country',
            'resident_city',
            'resident_postal_code',
            'resident_street',
            'nationality',
          ],
        },
      ],
    },
    {
      name: 'ARF PID (sd-jwt vc) - Mandatory',
      purpose: 'To grant you access we need to verify your ARF compliant PID',

      credentials: [
        {
          format: 'dc+sd-jwt',
          vcts: [arfCompliantPidSdJwt.vct],
          fields: [
            // Mandatory
            'family_name',
            'given_name',
            'birth_date',
            'age_over_18',

            // Mandatory metadata
            'issuance_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
          ],
        },
      ],
    },
    {
      name: 'BDR PID (sd-jwt vc) - Names',
      purpose: 'Please sign this document',
      credentials: [
        pidSdJwtCredential({
          fields: ['family_name', 'given_name'],
        }),
      ],
    },
    {
      name: 'ARF PID (sd-jwt vc) - Names',
      purpose: 'To grant you access we need to verify your ARF compliant PID',

      credentials: [
        {
          format: 'dc+sd-jwt',
          vcts: [arfCompliantPidSdJwt.vct],
          fields: [
            // Mandatory
            'family_name',
            'given_name',
          ],
        },
      ],
    },
    {
      name: 'PID (mdoc) - Most',
      purpose: 'To grant you access we need to verify your PID',

      credentials: [
        pidMdocCredential({
          fields: [
            // Mandatory
            'family_name',
            'given_name',
            'birth_date',
            'age_over_18',

            // Mandatory metadata
            'issuance_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',

            // Optional
            'age_over_12',
            'age_over_14',
            'age_over_16',
            'age_over_21',
            'age_over_65',
            'age_in_years',
            'age_birth_year',
            'family_name_birth',
            'birth_city',
            'resident_country',
            'resident_city',
            'resident_postal_code',
            'resident_street',
            'nationality',
          ],
        }),
      ],
    },
    {
      name: 'PID (mdoc) - Mandatory',
      purpose: 'To grant you access we need to verify your ARF compliant PID',

      credentials: [
        pidMdocCredential({
          fields: [
            // Mandatory
            'family_name',
            'given_name',
            'birth_date',
            'age_over_18',

            // Mandatory metadata
            'issuance_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
          ],
        }),
      ],
    },
    {
      name: 'PID (mdoc) - Names',
      purpose: 'To grant you access we need to verify your ARF compliant PID',

      credentials: [
        pidMdocCredential({
          fields: [
            // Mandatory
            'family_name',
            'given_name',
          ],
        }),
      ],
    },
    {
      name: 'mDL (mdoc) - Mandatory',
      purpose: 'To grant you access we need to verify your drivers license',
      credentials: [
        {
          format: 'mso_mdoc',
          doctype: mobileDriversLicenseMdoc.doctype,
          namespace: 'org.iso.18013.5.1',
          fields: [
            'given_name',
            'family_name',
            'birth_date',
            'document_number',
            'issue_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
            'driving_privileges',
          ],
        },
      ],
    },
    {
      name: 'mDL (mdoc) - Names',
      purpose: 'To grant you access we need to verify your drivers license',
      credentials: [
        {
          format: 'mso_mdoc',
          doctype: mobileDriversLicenseMdoc.doctype,
          namespace: 'org.iso.18013.5.1',
          fields: ['given_name', 'family_name'],
        },
      ],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
