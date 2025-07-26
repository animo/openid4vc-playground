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
import {
  dateToSeconds,
  oneYearInMilliseconds,
  serverStartupTimeInMilliseconds,
  tenDaysInMilliseconds,
} from '../utils/date'

const healthIdDisplay = {
  locale: 'en',
  name: 'Health-ID',
  text_color: '#FFFFFF',
  background_color: '#61719D',
  background_image: {
    url: `${AGENT_HOST}/assets/issuers/krankenkasse/credential.png`,
    uri: `${AGENT_HOST}/assets/issuers/krankenkasse/credential.png`,
  },
} satisfies CredentialConfigurationDisplay

const healthIdPayload = {
  health_insurance_id: 'A123456780101575519DE',
  affiliation_country: 'DE',
  wallet_e_prescription_code:
    '160.000.033.491.352.56&94c75e15e4c4dd6b50e3c18b92b4754e88fec4ab144e86a1b95df1209767978b&medication name',
  issuance_date: new DateOnly(new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds).toISOString()),
  expiry_date: new DateOnly(new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds).toISOString()),
  issuing_authority: 'DE',
  issuing_country: 'DE',
}

export const healthIdMdoc = {
  format: OpenId4VciCredentialFormatProfile.MsoMdoc,
  cryptographic_binding_methods_supported: ['cose_key'],
  cryptographic_suites_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'health-id-mdoc',
  doctype: 'eu.europa.ec.eudi.hiid.1',
  display: [healthIdDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} as const satisfies MdocConfiguration

export const healthIdMdocData = {
  credentialConfigurationId: 'health-id-mdoc',
  format: ClaimFormat.MsoMdoc,
  credential: {
    docType: healthIdMdoc.doctype,
    namespaces: {
      [healthIdMdoc.doctype]: healthIdPayload,
    },
    validityInfo: {
      validFrom: new Date(healthIdPayload.issuance_date.toISOString()),
      validUntil: new Date(healthIdPayload.expiry_date.toISOString()),
    },
  },
} satisfies StaticMdocSignInput

export const healthIdSdJwt = {
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  cryptographic_binding_methods_supported: ['jwk'],
  cryptographic_suites_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'health-id-sd-jwt',
  vct: 'eu.europa.ec.eudi.hiid.1',
  display: [healthIdDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} as const satisfies SdJwtConfiguration

export const healthIdSdJwtData = {
  credentialConfigurationId: 'health-id-sd-jwt',
  format: ClaimFormat.SdJwtVc,
  credential: {
    payload: {
      ...healthIdPayload,
      nbf: dateToSeconds(healthIdPayload.issuance_date),
      exp: dateToSeconds(healthIdPayload.expiry_date),
      issuance_date: healthIdPayload.issuance_date.toISOString(),
      expiry_date: healthIdPayload.expiry_date.toISOString(),
      vct: healthIdSdJwt.vct,
    },
    disclosureFrame: {
      _sd: ['health_insurance_id', 'affiliation_country', 'wallet_e_prescription_code'],
    },
  },
} satisfies StaticSdJwtSignInput

// https://animosolutions.getoutline.com/doc/certificate-of-residence-attestation-KjzG4n9VG0
export const krankenkasseIssuer = {
  tags: [healthIdDisplay.name],
  issuerId: 'a27a9f50-2b4d-4fac-99b6-9fd306641f9d',
  credentialConfigurationsSupported: [
    {
      'vc+sd-jwt': {
        configuration: healthIdSdJwt,
        data: healthIdSdJwtData,
      },
      mso_mdoc: {
        configuration: healthIdMdoc,
        data: healthIdMdocData,
      },
    },
  ],
  batchCredentialIssuance: {
    batchSize: 10,
  },
  display: [
    {
      name: 'Die Krankenkasse',
      logo: {
        url: `${AGENT_HOST}/assets/issuers/krankenkasse/issuer.png`,
        uri: `${AGENT_HOST}/assets/issuers/krankenkasse/issuer.png`,
      },
    },
  ],
} satisfies PlaygroundIssuerOptions

export const krankenkasseCredentialsData = {
  [healthIdSdJwtData.credentialConfigurationId]: healthIdSdJwtData,
  [healthIdMdocData.credentialConfigurationId]: healthIdMdocData,
}
