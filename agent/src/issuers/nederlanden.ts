import { ClaimFormat, DateOnly, Kms } from '@credo-ts/core'
import { OpenId4VciCredentialFormatProfile } from '@credo-ts/openid4vc'

import { AGENT_HOST } from '../constants'
import type {
  CredentialConfigurationDisplay,
  MdocConfiguration,
  PlaygroundIssuerOptions,
  SdJwtConfiguration,
} from '../issuer'
import type { StaticMdocSignInput, StaticSdJwtSignInput } from '../types'
import { dateToSeconds, oneYearInMilliseconds, serverStartupTimeInMilliseconds } from '../utils/date'

import { loadJPEGBufferSync } from '../utils/image'

// Reuse from BDR, not exactly the same as in document though
const erikaPortrait = loadJPEGBufferSync(`${__dirname}/../../assets/erika.jpeg`)

const photoIdDisplay = {
  locale: 'en',
  name: 'Photo ID',
  text_color: '#525C75',
  background_color: '#F5F7F8',
  background_image: {
    url: '',
    uri: '',
  },
} satisfies CredentialConfigurationDisplay

const photoIdPayload = {
  family_name_unicode: 'Mustermann',
  family_name_latin1: 'Mustermann',
  given_name_unicode: 'Erika',
  given_name_latin1: 'Erika',
  birth_date: new DateOnly('1986-03-14'),
  portrait: new Uint8Array(erikaPortrait),
  issue_date: new DateOnly('2024-08-01'),
  expiry_date: new DateOnly('2029-08-01'),
  issuing_authority_unicode: 'Fime',
  issuing_country: 'NL',
  age_over_18: true,
  age_in_years: 38,
  age_birth_year: 1986,
  portrait_capture_date: new Date('2022-11-14T00:00:00Z'),
  birthplace: 'The Netherlands, Leiden',
  name_at_birth: 'Erika Mustermann',
  resident_address_unicode: 'De Heyderweg 2, Leiden',
  resident_city_unicode: 'Leiden',
  resident_postal_code: '2314 XZ',
  resident_country: 'NL',
  sex: 2,
  nationality: 'NL',
  document_number: '0123456789',
}

const photoIdPayload_2 = {
  person_id: '1234567890',
  birth_country: 'NL',
  birth_state: 'Zuid-Holland',
  birth_city: 'Leiden',
  administrative_number: '9876543210',
  resident_street: 'De Heyderweg',
  resident_house_number: '2',
  travel_document_number: 'C11T002JM',
}

// FIXME: Document has insane large values for these fields
const photoIdPayload_3 = {
  dg1: 'many bytes',
  dg2: 'many bytes',
  sod: 'many bytes',
  // dg1: Uint8Array.from(Buffer.from('', 'hex')),
  // dg2: Uint8Array.from(Buffer.from('', 'hex')),
  // sod: Uint8Array.from(Buffer.from('', 'hex')),
}

export const photoIdMdoc = {
  format: OpenId4VciCredentialFormatProfile.MsoMdoc,
  cryptographic_binding_methods_supported: ['cose_key'],
  cryptographic_suites_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'photo-id-mdoc',
  doctype: 'org.iso.23220.photoID.1',
  display: [photoIdDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} as const satisfies MdocConfiguration

export const photoIdMdocData = {
  credentialConfigurationId: 'photo-id-mdoc',
  format: ClaimFormat.MsoMdoc,
  credential: {
    docType: photoIdMdoc.doctype,
    namespaces: {
      'org.iso.23220.1': {
        ...photoIdPayload,
      },
      'org.iso.23220.photoID.1': {
        ...photoIdPayload_2,
      },
      'org.iso.23220.datagroups.1': {
        ...photoIdPayload_3,
      },
    },
    validityInfo: {
      validFrom: new Date(photoIdPayload.issue_date.toISOString()),
      validUntil: new Date(photoIdPayload.expiry_date.toISOString()),

      // Causes issue in google identity credential if not present
      // Update half year before expiry
      expectedUpdate: new Date(serverStartupTimeInMilliseconds + Math.floor(oneYearInMilliseconds / 2)),
      signed: new Date(photoIdPayload.issue_date.toISOString()),
    },
  },
} satisfies StaticMdocSignInput

// ======= EU PID 1.5 =======

const eudiPidDisplay = {
  locale: 'en',
  name: 'EU PID 1.5',
  text_color: '#525C75',
  background_color: '#EBF1F3',
  background_image: {
    url: '',
    uri: '',
  },
} satisfies CredentialConfigurationDisplay

const eudiPidPayload = {
  family_name: 'Mustermann',
  given_name: 'Erika',
  birth_date: new DateOnly('1986-03-14'),
  birth_place: 'The Netherlands, Leiden',
  nationality: ['NL'],
  resident_address: 'De Heyderweg 2, Leiden',
  resident_country: 'NL',
  resident_state: 'Zuid-Holland',
  resident_city: 'Leiden',
  resident_postal_code: '2314 XZ',
  resident_street: 'De Heyderweg',
  resident_house_number: '2',
  personal_administrative_number: '9876543210',
  portrait: new Uint8Array(erikaPortrait),
  family_name_birth: 'Mustermann',
  given_name_birth: 'Erika',
  sex: 2,
  email_address: 'erika@mustermann.nl',
  mobile_phone_number: '+31717993005',
  expiry_date: new DateOnly('2030-01-28'),
  issuing_authority: 'Fime',
  issuing_country: 'NL',
  document_number: '0123456789',
  issuance_date: new DateOnly('2025-01-28'),
  age_over_18: true,
  age_in_years: 38,
  age_birth_year: 1986,
}

export const eudiPidMdoc = {
  format: OpenId4VciCredentialFormatProfile.MsoMdoc,
  cryptographic_binding_methods_supported: ['cose_key'],
  cryptographic_suites_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'eudi-pid-mdoc',
  doctype: 'eu.europa.ec.eudi.pid.1',
  display: [eudiPidDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} as const satisfies MdocConfiguration

export const eudiPidMdocData = {
  credentialConfigurationId: 'eudi-pid-mdoc',
  format: ClaimFormat.MsoMdoc,
  credential: {
    docType: eudiPidMdoc.doctype,
    namespaces: {
      [eudiPidMdoc.doctype]: {
        ...eudiPidPayload,
      },
    },
    validityInfo: {
      validFrom: new Date(eudiPidPayload.issuance_date.toISOString()),
      validUntil: new Date(eudiPidPayload.expiry_date.toISOString()),

      // Causes issue in google identity credential if not present
      // Update half year before expiry
      expectedUpdate: new Date(serverStartupTimeInMilliseconds + Math.floor(oneYearInMilliseconds / 2)),
      signed: new Date(eudiPidPayload.issuance_date.toISOString()),
    },
  },
} satisfies StaticMdocSignInput

export const eudiPidSdJwt = {
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  cryptographic_binding_methods_supported: ['jwk'],
  cryptographic_suites_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'eudi-pid-sd-jwt',
  vct: 'eu.europa.ec.eudi.pid.1',
  display: [eudiPidDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} as const satisfies SdJwtConfiguration

export const eudiPidSdJwtData = {
  credentialConfigurationId: 'eudi-pid-sd-jwt',
  format: ClaimFormat.SdJwtDc,
  credential: {
    payload: {
      ...eudiPidPayload,
      nbf: dateToSeconds(eudiPidPayload.issuance_date),
      exp: dateToSeconds(eudiPidPayload.expiry_date),
      issuance_date: eudiPidPayload.issuance_date.toISOString(),
      expiry_date: eudiPidPayload.expiry_date.toISOString(),
      vct: eudiPidSdJwt.vct,
      portrait: `data:image/jpeg;base64,${erikaPortrait.toString('base64')}`,
    },
    disclosureFrame: {
      _sd: [
        'family_name',
        'given_name',
        'birth_date',
        'birth_place',
        'nationality',
        'resident_address',
        'resident_country',
        'resident_state',
        'resident_city',
        'resident_postal_code',
        'resident_street',
        'resident_house_number',
        'personal_administrative_number',
        'portrait',
        'family_name_birth',
        'given_name_birth',
        'sex',
        'email_address',
        'mobile_phone_number',
        'expiry_date',
        'issuing_authority',
        'issuing_country',
        'document_number',
        'issuance_date',
        'age_over_18',
        'age_in_years',
        'age_birth_year',
      ],
    },
  },
} satisfies StaticSdJwtSignInput

// https://animosolutions.getoutline.com/doc/credential-msisdn-1BljW1GEM0
export const nederlandenIssuer = {
  tags: [photoIdDisplay.name, 'ARF 1.5 PID'],
  issuerId: '40adc717-933f-471c-ae42-0f5e92b3cca1',
  credentialConfigurationsSupported: [
    {
      'vc+sd-jwt': {
        configuration: eudiPidSdJwt,
        data: eudiPidSdJwtData,
      },
      mso_mdoc: {
        configuration: eudiPidMdoc,
        data: eudiPidMdocData,
      },
    },
    {
      mso_mdoc: {
        configuration: photoIdMdoc,
        data: photoIdMdocData,
      },
    },
  ],
  batchCredentialIssuance: {
    batchSize: 10,
  },
  display: [
    {
      name: 'Koninkrijk der Nederlanden',
      logo: {
        url: `${AGENT_HOST}/assets/issuers/nederlanden/issuer.png`,
        uri: `${AGENT_HOST}/assets/issuers/nederlanden/issuer.png`,
      },
    },
  ],
} satisfies PlaygroundIssuerOptions

export const nederlandenCredentialsData = {
  [photoIdMdocData.credentialConfigurationId]: photoIdMdocData,
  [eudiPidSdJwtData.credentialConfigurationId]: eudiPidSdJwtData,
  [eudiPidMdocData.credentialConfigurationId]: eudiPidMdocData,
}
