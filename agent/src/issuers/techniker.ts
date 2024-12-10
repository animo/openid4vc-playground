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
  health_insurance_id: 'A123456780101575519DE',
  affiliation_country: 'DE',
  wallet_e_prescription_code:
    '160.000.033.491.352.56&94c75e15e4c4dd6b50e3c18b92b4754e88fec4ab144e86a1b95df1209767978b&medication name',
  issue_date: new DateOnly(new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds).toISOString()),
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
      validFrom: healthIdPayload.issue_date,
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
      nbf: dateToSeconds(healthIdPayload.issue_date),
      exp: dateToSeconds(healthIdPayload.expiry_date),
      issue_date: healthIdPayload.issue_date.toISOString(),
      expiry_date: healthIdPayload.expiry_date.toISOString(),
      vct: healthIdSdJwt.vct,
    },
    disclosureFrame: {
      _sd: ['health_insurance_id', 'affiliation_country', 'wallet_e_prescription_code'],
    },
  },
  authorization: { type: 'browser' },
} satisfies StaticSdJwtSignInput

// https://animosolutions.getoutline.com/doc/certificate-of-residence-attestation-KjzG4n9VG0
export const technikerIssuer = {
  issuerId: 'a27a9f50-2b4d-4fac-99b6-9fd306641f9d',
  credentialConfigurationsSupported: { [healthIdSdJwt.id]: healthIdSdJwt, [healthIdMdoc.id]: healthIdMdoc },
  batchCredentialIssuance: {
    batchSize: 10,
  },
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
