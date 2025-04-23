import { AGENT_HOST } from '../constants'
import { arfCompliantPidSdJwt, arfCompliantPidUrnVctSdJwt, mobileDriversLicenseMdoc } from '../issuers/bdr'
import type { PlaygroundVerifierOptions } from '../verifier'
import { type MdocCredential, pidMdocCredential, type SdJwtCredential } from './util'

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

export const openIdInteropVerifier = {
  verifierId: '8caaebcc-d48c-471b-86b0-a534e15c4774',
  useCase: {
    name: 'OpenID Foundation Interop Event April',
    icon: 'interop',
    tags: ['Digital Credentials API', 'OpenID4VP Draft 24', 'mDOC', 'SD-JWT VC'],
  },

  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/animo/verifier.png`,
    client_name: 'Animo',
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
