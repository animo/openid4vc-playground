import { AGENT_HOST } from '../constants'
import { ageSdJwt } from '../issuers/credentials/ageSdJwt'
import { arfCompliantPidSdJwt } from '../issuers/credentials/arf18PidSdJwt'
import { mobileDriversLicenseMdoc } from '../issuers/credentials/mDLMdoc'
import { openIdSdJwt } from '../issuers/credentials/openIDSdJwt'
import { photoIdMdoc } from '../issuers/credentials/photoIdMdoc'

import type { PlaygroundVerifierOptions } from '../verifier'
import { type MdocCredential, pidMdocCredential, type SdJwtCredential } from './util'

const pidSdJwtVcNames = {
  format: 'dc+sd-jwt',
  vcts: [arfCompliantPidSdJwt.vct],
  fields: [
    // Mandatory
    'family_name',
    'given_name',
  ],
} satisfies SdJwtCredential

const pidSdJwtVcAge = {
  format: 'dc+sd-jwt',
  vcts: [arfCompliantPidSdJwt.vct],
  fields: [{ path: 'age_equal_or_over.18', values: [true] }],
} satisfies SdJwtCredential

const ageSdJwtVcAge = {
  format: 'dc+sd-jwt',
  vcts: [ageSdJwt.vct],
  fields: [{ path: 'age_over_18', values: [true] }],
} satisfies SdJwtCredential

const openidSdJwtVcAge = {
  format: 'dc+sd-jwt',
  vcts: [openIdSdJwt.vct],
  fields: [{ path: 'age_over_18', values: [true] }],
} satisfies SdJwtCredential

const pidMdocAge = pidMdocCredential({
  fields: [{ path: 'age_over_18', values: [true] }],
})

const mdlNames = {
  format: 'mso_mdoc',
  doctype: mobileDriversLicenseMdoc.doctype,
  namespace: 'org.iso.18013.5.1',
  fields: ['given_name', 'family_name'],
} satisfies MdocCredential

const mdlAge = {
  format: 'mso_mdoc',
  doctype: mobileDriversLicenseMdoc.doctype,
  namespace: 'org.iso.18013.5.1',
  fields: [{ path: 'age_over_18', values: [true] }],
} satisfies MdocCredential

const photoIdAge = {
  format: 'mso_mdoc',
  doctype: photoIdMdoc.doctype,
  namespace: 'org.iso.23220.1',
  fields: [{ path: 'age_over_18', values: [true] }],
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
    {
      name: 'mDL (mdoc) - Names',
      purpose: 'mDL - first_name and given_name',
      credentials: [mdlNames],
    },
    {
      name: 'PID (sd-jwt-vc) - Names',
      purpose: 'PID - first_name and given_name',
      credentials: [pidSdJwtVcNames],
    },
    {
      name: 'Age over 18 - PID or mDL or PhotoID (mdoc)',
      purpose: 'Age over 18 - PID or mDL or PhotoID (mdoc)',

      credentials: [pidMdocAge, mdlAge, photoIdAge],
      credential_sets: [[0, 1, 2]],
    },
    {
      name: 'Age over 18 - PID or Age or OpenID (sd-jwt-vc)',
      purpose: 'Age over 18 - PID or Age or OpenID (sd-jwt-vc)',

      credentials: [pidSdJwtVcAge, ageSdJwtVcAge, openidSdJwtVcAge],
      credential_sets: [[0, 1, 2]],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
