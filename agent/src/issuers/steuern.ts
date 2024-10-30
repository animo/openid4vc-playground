import { ClaimFormat, JwaSignatureAlgorithm } from '@credo-ts/core'
import {
  type OpenId4VciCreateIssuerOptions,
  OpenId4VciCredentialFormatProfile,
  type OpenId4VciCredentialSupportedWithId,
} from '@credo-ts/openid4vc'
import { DateOnly } from '@protokoll/mdoc-client/dist/cjs/src/cbor'
import { AGENT_HOST } from '../constants'
import type { CredentialDisplay, StaticMdocSignInput, StaticSdJwtSignInput } from '../types'
import {
  dateToSeconds,
  oneYearInMilliseconds,
  serverStartupTimeInMilliseconds,
  tenDaysInMilliseconds,
} from '../utils/date'

const steuerIdDisplay = {
  locale: 'en',
  name: 'STEUER-ID',
  text_color: '#525C75',
  background_color: '#CAD7E0',
  background_image: {
    url: `${AGENT_HOST}/assets/issuers/steuern/credential.png`,
    uri: `${AGENT_HOST}/assets/issuers/steuern/credential.png`,
  },
} satisfies CredentialDisplay

const steuerIdPayload = {
  tax_number: '9999999999',
  affiliation_country: 'DE',
  registered_family_name: 'Mustermann',
  registered_given_name: 'Erika',
  resident_address: 'Heidestrasse 17, 51147 koln',
  birth_date: new DateOnly('1964-08-12'),
  iban: 'DE89370400440532013000',
  credential_type: 'Tax number',

  issuance_date: new DateOnly(new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds).toISOString()),
  expiry_date: new DateOnly(new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds).toISOString()),
  issuing_authority: 'DE',
  issuing_country: 'DE',
}

export const steuerIdMdoc = {
  format: OpenId4VciCredentialFormatProfile.MsoMdoc,
  cryptographic_binding_methods_supported: ['cose_key'],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  id: 'steuer-id-mdoc',
  doctype: 'eu.europa.ec.eudi.hiid.1',
  display: [steuerIdDisplay],
} as const satisfies OpenId4VciCredentialSupportedWithId

export const steuerIdMdocData = {
  credentialSupportedId: steuerIdMdoc.id,
  format: ClaimFormat.MsoMdoc,
  docType: steuerIdMdoc.doctype,
  namespaces: {
    [steuerIdMdoc.doctype]: steuerIdPayload,
  },
  validityInfo: {
    validFrom: steuerIdPayload.issuance_date,
    validUntil: steuerIdPayload.expiry_date,
  },
} satisfies StaticMdocSignInput

export const steuerIdSdJwt = {
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  cryptographic_binding_methods_supported: ['jwk'],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  id: 'steuer-id-sd-jwt',
  vct: 'https://example.eudi.ec.europa.eu/tax-credential/1',
  display: [steuerIdDisplay],
} as const satisfies OpenId4VciCredentialSupportedWithId

export const steuerIdSdJwtData = {
  credentialSupportedId: steuerIdSdJwt.id,
  format: ClaimFormat.SdJwtVc,
  payload: {
    ...steuerIdPayload,
    birth_date: steuerIdPayload.birth_date.toISOString(),
    nbf: dateToSeconds(steuerIdPayload.issuance_date),
    exp: dateToSeconds(steuerIdPayload.expiry_date),
    issuance_date: steuerIdPayload.issuance_date.toISOString(),
    expiry_date: steuerIdPayload.expiry_date.toISOString(),
    vct: steuerIdSdJwt.vct,
  },
  disclosureFrame: {
    _sd: [
      'tax_number',
      'affiliation_country',
      'registered_family_name',
      'registered_given_name',
      'resident_address',
      'birth_date',
      'iban',
      'issuance_date',
      'expiry_date',
      'issuing_authority',
      'issuing_country',
    ],
  },
} satisfies StaticSdJwtSignInput

// https://animosolutions.getoutline.com/doc/certificate-of-residence-attestation-KjzG4n9VG0
export const steuernIssuer = {
  issuerId: '197625a0-b797-4559-80cc-bf5463b90dc3',
  credentialsSupported: [steuerIdSdJwt, steuerIdMdoc],
  display: [
    {
      name: 'Bundeszentralamt fur Steuern',
      logo: {
        url: `${AGENT_HOST}/assets/issuers/steuern/issuer.png`,
        uri: `${AGENT_HOST}/assets/issuers/steuern/issuer.png`,
      },
    },
  ],
} satisfies OpenId4VciCreateIssuerOptions

export const steuernCredentialsData = {
  [steuerIdSdJwtData.credentialSupportedId]: steuerIdSdJwtData,
  [steuerIdMdocData.credentialSupportedId]: steuerIdMdocData,
}
