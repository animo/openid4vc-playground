import { AGENT_HOST } from '../constants'
import { arfCompliantPidSdJwt, arfCompliantPidUrnVctSdJwt, mobileDriversLicenseMdoc } from '../issuers/bdr'
import type { PlaygroundVerifierOptions } from '../verifier'
import { type MdocCredential, type SdJwtCredential, pidMdocCredential } from './util'

const pidSdJwtVcNames = {
  format: 'dc+sd-jwt',
  vcts: [arfCompliantPidSdJwt.vct, arfCompliantPidUrnVctSdJwt.vct],
  fields: [
    // Mandatory
    'family_name',
    'given_name',
  ],
} satisfies SdJwtCredential

const pidSdJwtVcMandatory = {
  format: 'dc+sd-jwt',
  vcts: [arfCompliantPidSdJwt.vct, arfCompliantPidUrnVctSdJwt.vct],
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
} satisfies SdJwtCredential

const pidMdocMandatory = pidMdocCredential({
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
})

const pidMdocNames = pidMdocCredential({
  fields: ['family_name', 'given_name'],
})

const mDLMandatory = {
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
} satisfies MdocCredential

const mdlNames = {
  format: 'mso_mdoc',
  doctype: mobileDriversLicenseMdoc.doctype,
  namespace: 'org.iso.18013.5.1',
  fields: ['given_name', 'family_name'],
} satisfies MdocCredential

export const potentialVerifier = {
  verifierId: '826fc673-6c8b-4189-a5ec-0ed408f4e6a2',
  useCase: {
    name: 'Potential UC4 Interop Event April 2025',
    icon: 'interop',
    tags: ['ISO 18013-5', 'ISO 18013-7', 'PID SD-JWT VC', 'PID mDOC', 'Track 1', 'Track 2', 'Track 4'],
  },

  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/potential/verifier.png`,
    client_name: 'Potential UC4 Interop Event',
  },

  requests: [
    // mDL (mdoc)
    {
      name: 'mDL (mdoc) - Names',
      purpose: 'mDL - first_name and given_name',
      credentials: [mdlNames],
    },
    {
      name: 'mDL (mdoc) - Mandatory',
      purpose: 'mDL - all mandatory fields',
      credentials: [mDLMandatory],
    },

    // mDL (mdoc) and PID (sd-jwt)
    {
      name: 'mDL (mdoc) - PID (sd-jwt-vc) - Mandatory',
      purpose: 'mDL (mdoc) and PID (sd-jwt-vc) - all mandatory fields',

      credentials: [mDLMandatory, pidSdJwtVcMandatory],
    },
    {
      name: 'mDL (mdoc) - PID (sd-jwt-vc) - Names',
      purpose: 'mDL (mdoc) and PID (sd-jwt-vc) - first_name and given_name',

      credentials: [mdlNames, pidSdJwtVcNames],
    },

    // mDL (mdoc) and PID (mdoc)
    {
      name: 'mDL (mdoc) - PID (mdoc) - Mandatory',
      purpose: 'mDL (mdoc) and PID (mdoc) - all mandatory fields',

      credentials: [mDLMandatory, pidMdocMandatory],
    },
    {
      name: 'mDL (mdoc) - PID (mdoc) - Names',
      purpose: 'mDL (mdoc) and PID (mdoc) - first_name and given_name',

      credentials: [mdlNames, pidMdocNames],
    },

    {
      name: 'PID (mdoc) - Names',
      purpose: 'PID (mdoc) - first_name and given_name',
      credentials: [pidMdocNames],
    },
    {
      name: 'PID (mdoc) - Mandatory',
      purpose: 'PID (mdoc) - all mandatory fields',
      credentials: [pidMdocMandatory],
    },

    {
      name: 'PID (sd-jwt-vc) - Names',
      purpose: 'PID (sd-jwt-vc) - first_name and given_name',
      credentials: [pidSdJwtVcNames],
    },
    {
      name: 'PID (sd-jwt-vc) - Mandatory',
      purpose: 'PID (sd-jwt-vc) - all mandatory fields',
      credentials: [pidSdJwtVcMandatory],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
