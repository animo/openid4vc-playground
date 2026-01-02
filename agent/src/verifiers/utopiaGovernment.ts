import { AGENT_HOST } from '../constants'
import { eudiAgeMdoc } from '../issuers/credentials/eudiAgeMdoc'
import { eudiPidSdJwt } from '../issuers/credentials/eudiPidSdJwt'
import { mobileDriversLicenseMdoc } from '../issuers/credentials/mDLMdoc'
import { photoIdMdoc } from '../issuers/credentials/photoIdMdoc'

import type { PlaygroundVerifierOptions } from '../verifier'
import { type MdocCredential, pidMdocCredential, type SdJwtCredential } from './util'

const pidSdJwtVcNames = {
  format: 'dc+sd-jwt',
  vcts: [eudiPidSdJwt.vct],
  fields: [
    // Mandatory
    'family_name',
    'given_name',
  ],
} satisfies SdJwtCredential

const pidSdJwtVcPostalCodeOrResidentCity = {
  format: 'dc+sd-jwt',
  vcts: [eudiPidSdJwt.vct],
  fields: ['address.postal_code', 'address.locality', 'address.region'],
  field_options: [['address.postal_code'], ['address.locality', 'address.region']],
} satisfies SdJwtCredential

const pidSdJwtVcPostalCode = {
  format: 'dc+sd-jwt',
  vcts: [eudiPidSdJwt.vct],
  fields: [{ path: 'address.postal_code', values: ['90210'] }],
} satisfies SdJwtCredential

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

const mdocAge = {
  format: 'mso_mdoc',
  doctype: eudiAgeMdoc.doctype,
  namespace: eudiAgeMdoc.doctype,
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

export const utopiaGovernmentVerifier = {
  verifierId: '8caaebcc-d48c-471b-86b0-a534e15c4774',
  useCase: {
    name: 'Utopia Government',
    icon: 'interop',
    tags: [],
  },

  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/government.png`,
    client_name: 'Utopia Government',
    'client_name#nl': 'Utopia Overheid',
    'client_name#en': 'Utopia Government',
    'client_name#fi': 'Utopian hallitus',
    'client_name#sv': 'Utopia regering',
    'client_name#de': 'Utopia Regierung',
    'client_name#sq': 'Qeveria e Utopisë',
    'client_name#pt': 'Governo da Utopia',
  } as const,

  requests: [
    {
      name: 'mDL (mdoc) - Names',
      purpose: 'mDL (mdoc) - Names',
      credentials: [mdlNames],
    },
    {
      name: 'EUDI PID (sd-jwt-vc) - Names',
      purpose: 'EUDI PID (sd-jwt-vc) - Names',
      credentials: [pidSdJwtVcNames],
    },
    {
      name: 'EUDI PID (mdoc) - Names',
      purpose: 'EUDI PID (mdoc) - Names',
      credentials: [pidMdocNames],
    },
    {
      name: 'Names - PID or mDL (mdoc)',
      purpose: 'Names - PID or mDL (mdoc)',
      credentials: [pidMdocNames, mdlNames],
      credential_sets: [[0, 1]],
    },
    {
      name: 'PID - postal code or resident city (mdoc)',
      purpose: 'PID - postal code or resident city (mdoc)',
      credentials: [pidMdocPostalCodeOrResidentCity],
    },
    {
      name: 'PID - postal code or resident city (sd-jwt-vc)',
      purpose: 'PID - postal code or resident city (sd-jwt-vc)',
      credentials: [pidSdJwtVcPostalCodeOrResidentCity],
    },
    {
      name: 'Age over 18 - Age or mDL or PhotoID (mdoc)',
      purpose: 'Age over 18 - PID or mDL or PhotoID (mdoc)',

      credentials: [mdocAge, mdlAge, photoIdAge],
      credential_sets: [[0, 1, 2]],
    },
    {
      name: 'Postal code 90210 - PID or mDL or PhotoID (mdoc)',
      purpose: 'Postal code 90210 - PID or mDL or PhotoID (mdoc)',

      credentials: [pidMdocPostalCode, mdlPostalCode, photoIdPostalCode],
      credential_sets: [[0, 1, 2]],
    },
    {
      name: 'Postal code 90210 - PID (sd-jwt-vc)',
      purpose: 'Postal code 90210 - PID (sd-jwt-vc)',

      credentials: [pidSdJwtVcPostalCode],
    },
    {
      name: 'Names - mDL (mdoc) or PID (sd-jwt-vc)',
      purpose: 'Names - mDL (mdoc) or PID (sd-jwt-vc)',

      credentials: [mdlNames, pidSdJwtVcNames],
      credential_sets: [[0, 1]],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
