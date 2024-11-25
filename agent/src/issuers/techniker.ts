import { ClaimFormat, JwaSignatureAlgorithm } from '@credo-ts/core'
import {
  type OpenId4VciCreateIssuerOptions,
  type OpenId4VciCredentialConfigurationSupportedWithFormats,
  OpenId4VciCredentialFormatProfile,
} from '@credo-ts/openid4vc'
import { AGENT_HOST } from '../constants'
import type { CredentialDisplay, StaticMdocSignInput, StaticSdJwtSignInput } from '../types'
import {
  DateOnly,
  dateToSeconds,
  oneYearInMilliseconds,
  serverStartupTimeInMilliseconds,
  tenDaysInMilliseconds,
} from '../utils/date'

const healthIdDisplay = {
  locale: 'en',
  name: 'Gesundheitskarte',
  text_color: '#FFFFFF',
  background_color: '#61719D',
  background_image: {
    url: `${AGENT_HOST}/assets/issuers/techniker/credential.png`,
    uri: `${AGENT_HOST}/assets/issuers/techniker/credential.png`,
  },
} satisfies CredentialDisplay

const healthIdPayload = {
  health_insurance_id: 'A123456780',
  affiliation_country: 'DE',
  'matching_institution-id': '101575519',
  matching_registered_family_name: 'Mustermann',
  matching_registered_given_name: 'Erika',
  matching_resident_address: 'Heidestrasse 17, 51147 koln',
  matching_birth_date: new DateOnly('1964-08-12'),
  matching_birth_place: 'Berlin',
  issuance_date: new DateOnly(new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds).toISOString()),
  expiry_date: new DateOnly(new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds).toISOString()),
  issuing_authority: 'DE',
  issuing_country: 'DE',
}

export const healthIdMdoc = {
  format: OpenId4VciCredentialFormatProfile.MsoMdoc,
  cryptographic_binding_methods_supported: ['cose_key'],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  id: 'health-id-mdoc',
  scope: 'health-id-mdoc',
  doctype: 'eu.europa.ec.eudi.hiid.1',
  display: [healthIdDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [JwaSignatureAlgorithm.ES256],
    },
  },
} as const satisfies OpenId4VciCredentialConfigurationSupportedWithFormats

export const healthIdMdocData = {
  credentialConfigurationId: healthIdMdoc.id,
  format: ClaimFormat.MsoMdoc,
  credential: {
    docType: healthIdMdoc.doctype,
    namespaces: {
      [healthIdMdoc.doctype]: healthIdPayload,
    },
    validityInfo: {
      validFrom: healthIdPayload.issuance_date,
      validUntil: healthIdPayload.expiry_date,
    },
  },
  authorization: { type: 'browser' },
} satisfies StaticMdocSignInput

export const healthIdSdJwt = {
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  cryptographic_binding_methods_supported: ['jwk'],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  id: 'health-id-sd-jwt',
  scope: 'health-id-sd-jwt',
  vct: 'https://example.eudi.ec.europa.eu/hiid/1',
  display: [healthIdDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [JwaSignatureAlgorithm.ES256],
    },
  },
} as const satisfies OpenId4VciCredentialConfigurationSupportedWithFormats

export const healthIdSdJwtData = {
  credentialConfigurationId: healthIdSdJwt.id,
  format: ClaimFormat.SdJwtVc,
  credential: {
    payload: {
      ...healthIdPayload,
      matching_birth_date: healthIdPayload.matching_birth_date.toISOString(),
      nbf: dateToSeconds(healthIdPayload.issuance_date),
      exp: dateToSeconds(healthIdPayload.expiry_date),
      issuance_date: healthIdPayload.issuance_date.toISOString(),
      expiry_date: healthIdPayload.expiry_date.toISOString(),
      vct: healthIdSdJwt.vct,
    },
    disclosureFrame: {
      _sd: [
        'health_insurance_id',
        'affiliation_country',
        'matching_institution_id',
        'matching_registered_family_name',
        'matching_registered_given_name',
        'matching_resident_address',
        'matching_birth_date',
        'matching_birth_place',
      ],
    },
  },
  authorization: { type: 'browser' },
} satisfies StaticSdJwtSignInput

// https://animosolutions.getoutline.com/doc/certificate-of-residence-attestation-KjzG4n9VG0
export const technikerIssuer = {
  issuerId: 'a27a9f50-2b4d-4fac-99b6-9fd306641f9d',
  credentialConfigurationsSupported: { [healthIdSdJwt.id]: healthIdSdJwt, [healthIdMdoc.id]: healthIdMdoc },
  display: [
    {
      name: 'Die Techniker',
      logo: {
        url: `${AGENT_HOST}/assets/issuers/techniker/issuer.png`,
        uri: `${AGENT_HOST}/assets/issuers/techniker/issuer.png`,
      },
    },
  ],
} satisfies OpenId4VciCreateIssuerOptions

export const technikerCredentialsData = {
  [healthIdSdJwtData.credentialConfigurationId]: healthIdSdJwtData,
  [healthIdMdocData.credentialConfigurationId]: healthIdMdocData,
}
