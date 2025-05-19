import { AGENT_HOST } from '../constants'
import { ageSdJwt } from '../issuers/credentials/ageSdJwt'
import { arfCompliantPidSdJwt } from '../issuers/credentials/arf18PidSdJwt'
import { mobileDriversLicenseMdoc } from '../issuers/credentials/mDLMdoc'
import { openIdSdJwt } from '../issuers/credentials/openIDSdJwt'
import { photoIdMdoc } from '../issuers/credentials/photoIdMdoc'

import type { PlaygroundVerifierOptions } from '../verifier'
import { type MdocCredential, type SdJwtCredential, pidMdocCredential } from './util'

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

const pidSdJwtVcPostalCodeOrResidentCity = {
  format: 'dc+sd-jwt',
  vcts: [arfCompliantPidSdJwt.vct],
  fields: ['address.postal_code', 'address.locality', 'address.region'],
  field_options: [['address.postal_code'], ['address.locality', 'address.region']],
} satisfies SdJwtCredential

const pidSdJwtVcPostalCode = {
  format: 'dc+sd-jwt',
  vcts: [arfCompliantPidSdJwt.vct],
  fields: [{ path: 'address.postal_code', values: ['90210'] }],
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

const openidSdJwtVcNames = {
  format: 'dc+sd-jwt',
  vcts: [openIdSdJwt.vct],
  fields: ['given_name', 'family_name'],
} satisfies SdJwtCredential

const pidMdocAge = pidMdocCredential({
  fields: [{ path: 'age_over_18', values: [true] }],
})

const pidMdocNames = pidMdocCredential({
  fields: ['given_name', 'family_name'],
})

const pidMdocPostalCode = pidMdocCredential({
  fields: [{ path: 'resident_postal_code', values: ['90210'] }],
})

const pidMdocPostalCodeOrResidentCity = pidMdocCredential({
  fields: ['resident_postal_code', 'resident_city', 'resident_state'],
  field_options: [['resident_postal_code'], ['resident_city', 'resident_state']],
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

const mdlPostalCode = {
  format: 'mso_mdoc',
  doctype: mobileDriversLicenseMdoc.doctype,
  namespace: 'org.iso.18013.5.1',
  fields: [{ path: 'resident_postal_code', values: ['90210'] }],
} satisfies MdocCredential

const photoIdAge = {
  format: 'mso_mdoc',
  doctype: photoIdMdoc.doctype,
  namespace: 'org.iso.23220.1',
  fields: [{ path: 'age_over_18', values: [true] }],
} satisfies MdocCredential

const photoIdPostalCode = {
  format: 'mso_mdoc',
  doctype: photoIdMdoc.doctype,
  namespace: 'org.iso.23220.1',
  fields: [{ path: 'resident_postal_code', values: ['90210'] }],
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
      name: '#1 - mDL (mdoc) - Names',
      purpose: '#1 - mDL (mdoc) - Names',
      credentials: [mdlNames],
    },
    {
      name: '#2 - PID (sd-jwt-vc) - Names',
      purpose: '#2 - PID (sd-jwt-vc) - Names',
      credentials: [pidSdJwtVcNames],
    },
    {
      name: '#3 - PID (mdoc) - Names',
      purpose: '#3 - PID (mdoc) - Names',
      credentials: [pidMdocNames],
    },
    {
      name: '#4 - OpenID (sd-jwt-vc) - Names',
      purpose: '#4 - OpenID (sd-jwt-vc) - Names',
      credentials: [pidMdocNames],
    },
    {
      name: '#5 - Names - PID or mDL (mdoc)',
      purpose: '#5 - Names - PID or mDL (mdoc)',
      credentials: [pidMdocNames, mdlNames],
      credential_sets: [[0, 1]],
    },
    {
      name: '#6 - Names - PID or OpenID (sd-jwt-vc)',
      purpose: '#6 - Names - PID or OpenID (sd-jwt-vc)',
      credentials: [pidSdJwtVcNames, openidSdJwtVcNames],
      credential_sets: [[0, 1]],
    },
    {
      name: '#7 - PID - postal code or resident city (mdoc)',
      purpose: '#7 - PID - postal code or resident city (mdoc)',
      credentials: [pidMdocPostalCodeOrResidentCity],
    },
    {
      name: '#8 - PID - postal code or resident city (sd-jwt-vc)',
      purpose: '#8 - PID - postal code or resident city (sd-jwt-vc)',
      credentials: [pidSdJwtVcPostalCodeOrResidentCity],
    },
    {
      name: '#9 - Age over 18 - PID or mDL or PhotoID (mdoc)',
      purpose: '#9 - Age over 18 - PID or mDL or PhotoID (mdoc)',

      credentials: [pidMdocAge, mdlAge, photoIdAge],
      credential_sets: [[0, 1, 2]],
    },
    {
      name: '#10 - Postal code 90210 - PID or mDL or PhotoID (mdoc)',
      purpose: '#10 - Postal code 90210 - PID or mDL or PhotoID (mdoc)',

      credentials: [pidMdocPostalCode, mdlPostalCode, photoIdPostalCode],
      credential_sets: [[0, 1, 2]],
    },
    {
      name: '#11 - Age over 18 - PID or Age or OpenID (sd-jwt-vc)',
      purpose: '#11 - Age over 18 - PID or Age or OpenID (sd-jwt-vc)',

      credentials: [pidSdJwtVcAge, ageSdJwtVcAge, openidSdJwtVcAge],
      credential_sets: [[0, 1, 2]],
    },
    {
      name: '#12 - Postal code 90210 - PID (sd-jwt-vc)',
      purpose: '#12 - Postal code 90210 - PID (sd-jwt-vc)',

      credentials: [pidSdJwtVcPostalCode],
    },
    {
      name: '#13 - Names - mDL (mdoc) or PID (sd-jwt-vc)',
      purpose: '#13 - Names - mDL (mdoc) or PID (sd-jwt-vc)',

      credentials: [mdlNames, pidSdJwtVcNames],
      credential_sets: [[0, 1]],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
