import { ClaimFormat, DateOnly, JwaSignatureAlgorithm } from '@credo-ts/core'
import { OpenId4VciCredentialFormatProfile } from '@credo-ts/openid4vc'
import type { CredentialConfigurationDisplay, MdocConfiguration } from '../../issuer'
import type { StaticMdocSignInput } from '../../types'
import { oneYearInMilliseconds, serverStartupTimeInMilliseconds } from '../../utils/date'
import { loadJPEGBufferSync } from '../../utils/image'

const erikaPortrait = loadJPEGBufferSync(`${__dirname}/../../../assets/erika.jpeg`)

const photoIdDisplay = {
  locale: 'en',
  name: 'Photo ID',
  text_color: '#525C75',
  background_color: '#F5F7F8',
  background_image: {
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
  issue_date: new DateOnly(),
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
  resident_postal_code: '90210',
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
  dg1: Uint8Array.from(Buffer.from('many bytes')),
  dg2: Uint8Array.from(Buffer.from('many bytes')),
  sod: Uint8Array.from(Buffer.from('many bytes')),
}

export const photoIdMdoc = {
  format: OpenId4VciCredentialFormatProfile.MsoMdoc,
  cryptographic_binding_methods_supported: ['cose_key'],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  scope: 'government-photo-id-mdoc',
  doctype: 'org.iso.23220.photoID.1',
  display: [photoIdDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [JwaSignatureAlgorithm.ES256],
    },
  },
} as const satisfies MdocConfiguration

export const photoIdMdocData = {
  credentialConfigurationId: 'government-photo-id-mdoc',
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
