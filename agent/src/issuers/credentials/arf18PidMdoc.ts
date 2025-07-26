import { ClaimFormat, DateOnly, Kms } from '@credo-ts/core'
import { OpenId4VciCredentialFormatProfile } from '@credo-ts/openid4vc'
import { AGENT_HOST } from '../../constants'
import type { MdocConfiguration } from '../../issuer'
import type { StaticMdocSignInput } from '../../types'
import { oneYearInMilliseconds, serverStartupTimeInMilliseconds } from '../../utils/date'
import { loadJPEGBufferSync } from '../../utils/image'

const erikaPortrait = loadJPEGBufferSync(`${__dirname}/../../../assets/erika.jpeg`)

const arfPidPayload = {
  family_name: 'Mustermann',
  given_name: 'Erika',
  birth_date: new DateOnly('1986-03-14'),
  birth_place: 'The Netherlands, Leiden',
  nationality: ['NL'],
  resident_address: 'De Heyderweg 2, Leiden',
  resident_country: 'NL',
  resident_state: 'Zuid-Holland',
  resident_city: 'Leiden',
  resident_postal_code: '90210',
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
  issuance_date: new DateOnly(),
  age_over_18: true,
  age_in_years: 38,
  age_birth_year: 1986,
}

export const arfPidMdoc = {
  format: OpenId4VciCredentialFormatProfile.MsoMdoc,
  cryptographic_binding_methods_supported: ['cose_key'],
  cryptographic_suites_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'government-arf-18-pid-mdoc',
  doctype: 'eu.europa.ec.eudi.pid.1',
  display: [
    {
      locale: 'en',
      name: 'ARF 1.8 PID',
      text_color: '#2F3544',
      background_color: '#F1F2F0',
      background_image: {
        url: `${AGENT_HOST}/assets/issuers/bdr/pid-credential.png`,
        uri: `${AGENT_HOST}/assets/issuers/bdr/pid-credential.png`,
      },
    },
  ],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} as const satisfies MdocConfiguration

export const arfPidMdocData = {
  credentialConfigurationId: 'government-arf-18-pid-mdoc',
  format: ClaimFormat.MsoMdoc,
  credential: {
    docType: arfPidMdoc.doctype,
    namespaces: {
      [arfPidMdoc.doctype]: {
        ...arfPidPayload,
      },
    },
    validityInfo: {
      validFrom: new Date(arfPidPayload.issuance_date.toISOString()),
      validUntil: new Date(arfPidPayload.expiry_date.toISOString()),

      // Causes issue in google identity credential if not present
      // Update half year before expiry
      expectedUpdate: new Date(serverStartupTimeInMilliseconds + Math.floor(oneYearInMilliseconds / 2)),
      signed: new Date(arfPidPayload.issuance_date.toISOString()),
    },
  },
} satisfies StaticMdocSignInput
