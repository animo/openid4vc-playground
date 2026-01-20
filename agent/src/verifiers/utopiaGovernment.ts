import { AGENT_HOST } from '../constants.js'
import { eudiAgeMdoc } from '../issuers/credentials/eudiAgeMdoc.js'
import { eudiPidSdJwt } from '../issuers/credentials/eudiPidSdJwt.js'
import { mobileDriversLicenseMdoc } from '../issuers/credentials/mDLMdoc.js'
import { photoIdMdoc } from '../issuers/credentials/photoIdMdoc.js'

import type { PlaygroundVerifierOptions } from '../verifier.js'
import { type MdocCredential, pidMdocCredential, type SdJwtCredential } from './util.js'

const _pidSdJwtVcNames = {
  format: 'dc+sd-jwt',
  vcts: [eudiPidSdJwt.vct],
  fields: [
    // Mandatory
    'family_name',
    'given_name',
  ],
} satisfies SdJwtCredential

const _pidSdJwtVcPostalCodeOrResidentCity = {
  format: 'dc+sd-jwt',
  vcts: [eudiPidSdJwt.vct],
  fields: ['address.postal_code', 'address.locality', 'address.region'],
  field_options: [['address.postal_code'], ['address.locality', 'address.region']],
} satisfies SdJwtCredential

const _pidSdJwtVcPostalCode = {
  format: 'dc+sd-jwt',
  vcts: [eudiPidSdJwt.vct],
  fields: [{ path: 'address.postal_code', values: ['90210'] }],
} satisfies SdJwtCredential

const _pidMdocNames = pidMdocCredential({
  fields: ['given_name', 'family_name'],
})
const pidMdocMinimal = pidMdocCredential({
  fields: ['given_name', 'family_name', 'portrait'],
})
const pidMdocFull = pidMdocCredential({
  fields: [
    'given_name',
    'family_name',
    'birth_date',
    'birth_place',
    'nationality',
    'portrait',
    'family_name_birth',
    'issuing_country',
    'issuance_date',
    'expiry_date',
    'age_over_18',
    'age_in_years',
    'age_birth_year',
  ],
})

const pidMdocAge = pidMdocCredential({
  fields: ['age_over_18', { path: 'issuing_country', values: ['FR'] }, 'expiry_date'],
})

const _pidMdocPostalCode = pidMdocCredential({
  fields: [{ path: 'resident_postal_code', values: ['90210'] }],
})

const _pidMdocPostalCodeOrResidentCity = pidMdocCredential({
  fields: ['resident_postal_code', 'resident_city', 'resident_state'],
  field_options: [['resident_postal_code'], ['resident_city', 'resident_state']],
})

const _mdlNames = {
  format: 'mso_mdoc',
  doctype: mobileDriversLicenseMdoc.doctype,
  namespace: 'org.iso.18013.5.1',
  fields: ['given_name', 'family_name'],
} satisfies MdocCredential

const _mdlAge = {
  format: 'mso_mdoc',
  doctype: mobileDriversLicenseMdoc.doctype,
  namespace: 'org.iso.18013.5.1',
  fields: [{ path: 'age_over_18', values: [true] }],
} satisfies MdocCredential

const mdocAge = {
  format: 'mso_mdoc',
  doctype: eudiAgeMdoc.doctype,
  namespace: eudiAgeMdoc.doctype,
  fields: ['age_over_18', 'issuing_country', 'expiry_date'],
} satisfies MdocCredential

const _mdlPostalCode = {
  format: 'mso_mdoc',
  doctype: mobileDriversLicenseMdoc.doctype,
  namespace: 'org.iso.18013.5.1',
  fields: [{ path: 'resident_postal_code', values: ['90210'] }],
} satisfies MdocCredential

const _photoIdAge = {
  format: 'mso_mdoc',
  doctype: photoIdMdoc.doctype,
  namespace: 'org.iso.23220.1',
  fields: [{ path: 'age_over_18', values: [true] }],
} satisfies MdocCredential

const _photoIdPostalCode = {
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
    // {
    //   name: 'mDL (mdoc) - Names',
    //   purpose: 'mDL (mdoc) - Names',
    //   credentials: [mdlNames],
    // },
    // {
    //   name: 'EUDI PID (sd-jwt-vc) - Names',
    //   purpose: 'EUDI PID (sd-jwt-vc) - Names',
    //   credentials: [pidSdJwtVcNames],
    // },
    {
      name: 'EUDI PID - Minimal',
      purpose: 'EUDI PID - Minimal',
      credentials: [pidMdocMinimal],
    },
    {
      name: 'EUDI PID - Full',
      purpose: 'EUDI PID - Full',
      credentials: [pidMdocFull],
    },
    // {
    //   name: 'Names - PID or mDL (mdoc)',
    //   purpose: 'Names - PID or mDL (mdoc)',
    //   credentials: [pidMdocNames, mdlNames],
    //   credential_sets: [[0, 1]],
    // },
    // {
    //   name: 'PID - postal code or resident city (mdoc)',
    //   purpose: 'PID - postal code or resident city (mdoc)',
    //   credentials: [pidMdocPostalCodeOrResidentCity],
    // },
    // {
    //   name: 'PID - postal code or resident city (sd-jwt-vc)',
    //   purpose: 'PID - postal code or resident city (sd-jwt-vc)',
    //   credentials: [pidSdJwtVcPostalCodeOrResidentCity],
    // },
    {
      name: 'EUDI Age - Age over 18',
      purpose: 'EUDI Age - Age over 18',

      credentials: [mdocAge],
    },
    {
      name: 'EUDI PID - Age over 18',
      purpose: 'EUDI PID - Age over 18',

      credentials: [pidMdocAge],
    },
    // {
    //   name: 'EUDI Age or PID - Age over 18',
    //   purpose: 'EUDI Age or PID - Age over 18',

    //   credentials: [mdocAge, pidMdocAge],
    //   credential_sets: [[0, 1]],
    // },
    // {
    //   name: 'Postal code 90210 - PID (mdoc)',
    //   purpose: 'Postal code 90210 - PID or mDL or PhotoID (mdoc)',

    //   credentials: [pidMdocPostalCode, mdlPostalCode, photoIdPostalCode],
    //   credential_sets: [[0, 1, 2]],
    // },
    // {
    //   name: 'Postal code 90210 - PID (sd-jwt-vc)',
    //   purpose: 'Postal code 90210 - PID (sd-jwt-vc)',

    //   credentials: [pidSdJwtVcPostalCode],
    // },
    // {
    //   name: 'Names - mDL (mdoc) or PID (sd-jwt-vc)',
    //   purpose: 'Names - mDL (mdoc) or PID (sd-jwt-vc)',

    //   credentials: [mdlNames, pidSdJwtVcNames],
    //   credential_sets: [[0, 1]],
    // },
  ],
} as const satisfies PlaygroundVerifierOptions
