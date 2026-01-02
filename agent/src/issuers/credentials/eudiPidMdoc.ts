import { ClaimFormat, DateOnly, Kms } from '@credo-ts/core'
import { OpenId4VciCredentialFormatProfile } from '@credo-ts/openid4vc'
import { AGENT_HOST } from '../../constants'
import type { MdocConfiguration } from '../../issuer'
import type { StaticMdocSignInput } from '../../types'
import { oneYearInMilliseconds, serverStartupTimeInMilliseconds } from '../../utils/date'
import { loadJPEGBufferSync } from '../../utils/image'

const erikaPortrait = loadJPEGBufferSync(`${__dirname}/../../../assets/erika.jpeg`)

// Dates for validity
const issuanceDate = new DateOnly() // Current date
const expiryDate = new DateOnly('2030-01-28')

const eudiPidPayload = {
  // Mandatory attributes (Section 2.2, 3.1.1)
  family_name: 'Mustermann',
  given_name: 'Erika',
  birth_date: new DateOnly('1964-08-12'), // Using full-date format
  place_of_birth: {
    // Section 3.1.5 - structured object
    country: 'NL',
    region: 'Zuid-Holland',
    locality: 'Leiden',
  },
  nationality: ['NL'], // Note: attribute name is 'nationality', value is array (Section 3.1.2)

  // Optional attributes (Section 2.3, 3.1.1)
  resident_address: 'Rietveld 1, 2312 JD, Leiden',
  resident_country: 'NL',
  resident_state: 'Zuid-Holland',
  resident_city: 'Leiden',
  resident_postal_code: '2312 JD',
  resident_street: 'Rietveld',
  resident_house_number: '1',
  personal_administrative_number: '123456782',
  portrait: new Uint8Array(erikaPortrait),
  family_name_birth: 'Mustermann',
  given_name_birth: 'Erika',
  sex: 2, // 2 = female (Section 2.3)
  email_address: 'erika@mustermann.nl',
  mobile_phone_number: '+31123456789',

  // Mandatory metadata (Section 2.4, 3.1.1)
  expiry_date: expiryDate, // Administrative validity period
  issuing_authority: 'Rijksdienst voor Identiteitsgegevens',
  issuing_country: 'NL',

  // Optional metadata (Section 2.5, 3.1.1)
  document_number: 'A01234567',

  // Additional optional attributes (Section 2.6, 3.1.1)
  issuance_date: issuanceDate, // Administrative validity period start
}

const eudiPidMdocDisplay = {
  locale: 'en',
  name: 'EUDI PID',
  text_color: '#2F3544',
  background_color: '#F1F2F0',
  background_image: {
    url: `${AGENT_HOST}/assets/credentials/pid.png`,
    uri: `${AGENT_HOST}/assets/credentials/pid.png`,
  },
} as const

export const eudiPidMdoc = {
  format: OpenId4VciCredentialFormatProfile.MsoMdoc,
  cryptographic_binding_methods_supported: ['cose_key'],
  credential_signing_alg_values_supported: [Kms.KnownCoseSignatureAlgorithms.ESP256],
  scope: 'eudi-pid-mdoc',
  doctype: 'eu.europa.ec.eudi.pid.1',
  display: [eudiPidMdocDisplay],
  credential_metadata: { display: [eudiPidMdocDisplay] },
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
      // Technical validity period (typically short - days/weeks)
      validFrom: new Date(eudiPidPayload.issuance_date.toISOString()),
      validUntil: new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds),

      // Update half year before expiry
      expectedUpdate: new Date(serverStartupTimeInMilliseconds + Math.floor(oneYearInMilliseconds / 2)),
      signed: new Date(eudiPidPayload.issuance_date.toISOString()),
    },
  },
} satisfies StaticMdocSignInput
