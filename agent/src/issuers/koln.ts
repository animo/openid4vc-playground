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

const certificateOfResidenceDisplay = {
  locale: 'en',
  name: 'Meldebestätigung',
  text_color: '#525C75',
  background_color: '#E4DEDD',
  background_image: {
    url: `${AGENT_HOST}/assets/issuers/koln/credential.png`,
    uri: `${AGENT_HOST}/assets/issuers/koln/credential.png`,
  },
} satisfies CredentialDisplay

const certificateOfResidencePayload = {
  family_name: 'Mustermann',
  given_name: 'Erika',
  birth_date: new DateOnly('1964-08-12'),
  resident_address: 'Heidestrasse 17, 51147 Koln',
  gender: 2,
  birth_place: 'koln',
  arrival_date: new DateOnly('2024-03-01'),
  nationality: 'DE',
  issuance_date: new DateOnly(new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds).toISOString()),
  expiry_date: new DateOnly(new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds).toISOString()),
  issuing_country: 'DE',
}

export const certificateOfResidenceMdoc = {
  format: OpenId4VciCredentialFormatProfile.MsoMdoc,
  cryptographic_binding_methods_supported: ['cose_key'],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  id: 'certificate-of-residence-mdoc',
  scope: 'certificate-of-residence-mdoc',
  doctype: 'eu.europa.ec.eudi.cor.1',
  display: [certificateOfResidenceDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [JwaSignatureAlgorithm.ES256],
    },
  },
} as const satisfies OpenId4VciCredentialConfigurationSupportedWithFormats

export const certificateOfResidenceMdocData = {
  credentialConfigurationId: certificateOfResidenceMdoc.id,
  format: ClaimFormat.MsoMdoc,
  credential: {
    docType: certificateOfResidenceMdoc.doctype,
    namespaces: {
      [certificateOfResidenceMdoc.doctype]: { ...certificateOfResidencePayload },
    },
    validityInfo: {
      validFrom: certificateOfResidencePayload.issuance_date,
      validUntil: certificateOfResidencePayload.expiry_date,
    },
  },

  authorization: { type: 'pin' },
} satisfies StaticMdocSignInput

export const certificateOfResidenceSdJwt = {
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  cryptographic_binding_methods_supported: ['jwk'],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  id: 'certificate-of-residence-sd-jwt',
  scope: 'certificate-of-residence-sd-jwt',
  vct: 'https://example.eudi.ec.europa.eu/cor/1',
  display: [certificateOfResidenceDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [JwaSignatureAlgorithm.ES256],
    },
  },
} as const satisfies OpenId4VciCredentialConfigurationSupportedWithFormats

export const certificateOfResidenceSdJwtData = {
  credentialConfigurationId: certificateOfResidenceSdJwt.id,
  format: ClaimFormat.SdJwtVc,
  credential: {
    payload: {
      ...certificateOfResidencePayload,
      birth_date: certificateOfResidencePayload.birth_date.toISOString(),
      arrival_date: certificateOfResidencePayload.arrival_date.toISOString(),
      nbf: dateToSeconds(certificateOfResidencePayload.issuance_date),
      exp: dateToSeconds(certificateOfResidencePayload.expiry_date),
      issuance_date: certificateOfResidencePayload.issuance_date.toISOString(),
      expiry_date: certificateOfResidencePayload.expiry_date.toISOString(),
      vct: certificateOfResidenceSdJwt.vct,
    },
    disclosureFrame: {
      _sd: [
        'family_name',
        'given_name',
        'resident_address',
        'birth_date',
        'gender',
        'birth_place',
        'arrival_date',
        'nationality',
      ],
    },
  },

  authorization: { type: 'pin' },
} satisfies StaticSdJwtSignInput

// https://animosolutions.getoutline.com/doc/certificate-of-residence-attestation-KjzG4n9VG0
export const kolnIssuer = {
  issuerId: '832f1c72-817d-4a54-b0fc-9994ecaba291',
  credentialConfigurationsSupported: {
    [certificateOfResidenceSdJwt.id]: certificateOfResidenceSdJwt,
    [certificateOfResidenceMdoc.id]: certificateOfResidenceMdoc,
  },
  display: [
    {
      name: 'Bürgeramt Köln',
      logo: {
        url: `${AGENT_HOST}/assets/issuers/koln/issuer.png`,
        uri: `${AGENT_HOST}/assets/issuers/koln/issuer.png`,
      },
    },
  ],
} satisfies OpenId4VciCreateIssuerOptions

export const kolnCredentialsData = {
  [certificateOfResidenceSdJwtData.credentialConfigurationId]: certificateOfResidenceSdJwtData,
  [certificateOfResidenceMdocData.credentialConfigurationId]: certificateOfResidenceMdocData,
}
