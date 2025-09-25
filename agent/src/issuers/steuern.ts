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

const taxIdDisplay = {
  locale: 'en',
  name: 'Tax-ID',
  text_color: '#525C75',
  background_color: '#CAD7E0',
  background_image: {
    url: `${AGENT_HOST}/assets/issuers/steuern/credential.png`,
    uri: `${AGENT_HOST}/assets/issuers/steuern/credential.png`,
  },
} satisfies CredentialConfigurationDisplay

const taxIdPayload = {
  tax_number: '06958170437',
  affiliation_country: 'DE',
  registered_family_name: 'Seiwal',
  registered_given_name: 'Ines',
  resident_address: 'Gotenring 6, 50667 Köln',
  birth_date: new DateOnly('2000-12-12'),
  church_tax_ID: 'DE123456789',
  iban: 'DE89370400440532013000',
  pid_id: 'PID123456789',

  credential_type: 'Tax number',
  issuing_authority: 'DE',
  issuing_country: 'DE',

  issuance_date: new DateOnly(new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds).toISOString()),
  expiry_date: new DateOnly(new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds).toISOString()),
}

export const taxIdMdoc = {
  format: OpenId4VciCredentialFormatProfile.MsoMdoc,
  cryptographic_binding_methods_supported: ['cose_key'],
  cryptographic_suites_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'tax-id-mdoc',
  doctype: 'eu.europa.ec.eudi.taxid.1',
  display: [taxIdDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} as const satisfies MdocConfiguration

export const taxIdMdocData = {
  credentialConfigurationId: 'tax-id-mdoc',
  format: ClaimFormat.MsoMdoc,
  credential: {
    docType: taxIdMdoc.doctype,
    namespaces: {
      [taxIdMdoc.doctype]: taxIdPayload,
    },
    validityInfo: {
      validFrom: new Date(taxIdPayload.issuance_date.toISOString()),
      validUntil: new Date(taxIdPayload.expiry_date.toISOString()),
    },
  },
} satisfies StaticMdocSignInput

export const taxIdSdJwt = {
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  cryptographic_binding_methods_supported: ['jwk'],
  cryptographic_suites_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'tax-id-sd-jwt',
  vct: 'https://example.eudi.ec.europa.eu/tax-id/1',
  display: [taxIdDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} as const satisfies SdJwtConfiguration

export const taxIdSdJwtData = {
  credentialConfigurationId: 'tax-id-sd-jwt',
  format: ClaimFormat.SdJwtDc,
  credential: {
    payload: {
      ...taxIdPayload,
      birth_date: taxIdPayload.birth_date.toISOString(),
      nbf: dateToSeconds(taxIdPayload.issuance_date),
      exp: dateToSeconds(taxIdPayload.expiry_date),
      issuance_date: taxIdPayload.issuance_date.toISOString(),
      expiry_date: taxIdPayload.expiry_date.toISOString(),
      vct: taxIdSdJwt.vct,
    },
    disclosureFrame: {
      _sd: [
        'tax_number',
        'affiliation_country',
        'registered_family_name',
        'registered_given_name',
        'resident_address',
        'birth_date',
        'church_tax_ID',
        'iban',
        'pid_id',

        'issuance_date',
        'expiry_date',
        'issuing_authority',
        'issuing_country',
      ],
    },
  },
} satisfies StaticSdJwtSignInput

// https://animosolutions.getoutline.com/doc/certificate-of-residence-attestation-KjzG4n9VG0
export const steuernIssuer = {
  tags: [taxIdDisplay.name],
  issuerId: '197625a0-b797-4559-80cc-bf5463b90dc3',
  credentialConfigurationsSupported: [
    {
      'vc+sd-jwt': {
        configuration: taxIdSdJwt,
        data: taxIdSdJwtData,
      },
      mso_mdoc: {
        configuration: taxIdMdoc,
        data: taxIdMdocData,
      },
    },
  ],
  batchCredentialIssuance: {
    batchSize: 10,
  },
  display: [
    {
      name: 'Bundeszentralamt fur Steuern',
      logo: {
        url: `${AGENT_HOST}/assets/issuers/steuern/issuer.png`,
        uri: `${AGENT_HOST}/assets/issuers/steuern/issuer.png`,
      },
    },
  ],
} satisfies PlaygroundIssuerOptions

export const steuernCredentialsData = {
  [taxIdSdJwtData.credentialConfigurationId]: taxIdSdJwtData,
  [taxIdMdocData.credentialConfigurationId]: taxIdMdocData,
}
