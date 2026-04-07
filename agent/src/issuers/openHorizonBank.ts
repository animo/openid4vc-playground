import { Kms } from '@credo-ts/core'
import { OpenId4VciCredentialFormatProfile } from '@credo-ts/openid4vc'
import { AGENT_HOST } from '../constants.js'
import type { PlaygroundIssuerOptions, SdJwtConfiguration } from '../issuer.js'
import { dateToSeconds } from '../utils/date.js'

const issuerId = '7cc028a3-8ce2-432a-bf19-5621068586df'

const weroCardDisplay = {
  locale: 'en',
  name: 'Wero Bank Account',
  text_color: '#1D1C1C',
  background_color: '#fff48d',
  background_image: {
    uri: `${AGENT_HOST}/assets/credentials/wero_background.jpeg`,
    url: `${AGENT_HOST}/assets/credentials/wero_background.jpeg`,
  },
} as const

const weroCardThirdPartyDisplay = {
  locale: 'en',
  name: 'Wero Bank Account (Third Party)',
  text_color: '#1D1C1C',
  background_color: '#fff48d',
  background_image: {
    uri: `${AGENT_HOST}/assets/credentials/wero_background.jpeg`,
    url: `${AGENT_HOST}/assets/credentials/wero_background.jpeg`,
  },
} as const

export const weroScaConfiguration = {
  format: OpenId4VciCredentialFormatProfile.SdJwtDc,
  vct: 'eu.europa.wero.card',
  scope: 'wero-card-sd-jwt',
  cryptographic_binding_methods_supported: ['jwk'],
  credential_signing_alg_values_supported: [
    Kms.KnownJwaSignatureAlgorithms.EdDSA,
    Kms.KnownJwaSignatureAlgorithms.ES256,
  ],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [
        Kms.KnownJwaSignatureAlgorithms.ES256,
        Kms.KnownJwaSignatureAlgorithms.EdDSA,
      ],
    },
  },
  display: [weroCardDisplay],
  credential_metadata: { display: [weroCardDisplay] },
  credential_metadata_uri: `${AGENT_HOST}/payment-credential-metadata`,
} as const satisfies SdJwtConfiguration

export const weroScaThirdPartyConfiguration = {
  format: OpenId4VciCredentialFormatProfile.SdJwtDc,
  vct: 'eu.europa.wero.card.third.party',
  scope: 'wero-card-third-party-sd-jwt',
  cryptographic_binding_methods_supported: ['jwk'],
  credential_signing_alg_values_supported: [
    Kms.KnownJwaSignatureAlgorithms.EdDSA,
    Kms.KnownJwaSignatureAlgorithms.ES256,
  ],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [
        Kms.KnownJwaSignatureAlgorithms.ES256,
        Kms.KnownJwaSignatureAlgorithms.EdDSA,
      ],
    },
  },
  display: [weroCardThirdPartyDisplay],
  credential_metadata: { display: [weroCardThirdPartyDisplay] },
  credential_metadata_uri: `${AGENT_HOST}/payment-credential-metadata`,
} as const satisfies SdJwtConfiguration

const now = new Date()
const expiry = new Date()
expiry.setFullYear(now.getFullYear() + 3)

const weroPayloadClaims = {
  account_holder_name: 'Erika Mustermann',
  account_holder_id: '1234567890',
  account_id: 'DE22123456781234567890',
  email: 'erika.mustermann@email.com',
  currency: 'EUR',
  scheme: 'Wero',
} as const

const weroPayloadThirdPartyClaims = {
  account_holder_name: 'John Cheese',
  account_holder_id: '0987654321',
  account_id: 'DE18446744073709551612',
  email: 'john.cheese@email.com',
  currency: 'EUR',
  scheme: 'Wero',
} as const

const weroScaData = {
  credentialConfigurationId: weroScaConfiguration.scope,
  format: weroScaConfiguration.format,
  credential: {
    payload: {
      ...weroPayloadClaims,
      iat: dateToSeconds(now),
      nbf: dateToSeconds(now),
      exp: dateToSeconds(expiry),
      vct: weroScaConfiguration.vct,
    },
    disclosureFrame: {
      _sd: Object.keys(weroPayloadClaims),
    },
  },
} as const

const weroScaThirdPartyData = {
  credentialConfigurationId: weroScaThirdPartyConfiguration.scope,
  format: weroScaThirdPartyConfiguration.format,
  credential: {
    payload: {
      ...weroPayloadThirdPartyClaims,
      iat: dateToSeconds(now),
      nbf: dateToSeconds(now),
      exp: dateToSeconds(expiry),
      vct: weroScaThirdPartyConfiguration.vct,
    },
    disclosureFrame: {
      _sd: Object.keys(weroPayloadThirdPartyClaims),
    },
  },
} as const

export const openHorizonBankIssuer = {
  tags: [weroCardDisplay.name, 'TS12 Payment'],
  issuerId,
  credentialConfigurationsSupported: [
    {
      [OpenId4VciCredentialFormatProfile.SdJwtDc]: {
        configuration: weroScaConfiguration,
        data: weroScaData,
      },
    },
    {
      [OpenId4VciCredentialFormatProfile.SdJwtDc]: {
        configuration: weroScaThirdPartyConfiguration,
        data: weroScaThirdPartyData,
      },
    },
  ],
  display: [
    {
      name: 'Open Horizon Bank',
      logo: {
        url: `${AGENT_HOST}/assets/verifiers/openbank.png`,
        uri: `${AGENT_HOST}/assets/verifiers/openbank.png`,
      },
    },
  ],
} satisfies PlaygroundIssuerOptions

export const openHorizonbankCredentialMetadata = {
  display: [{ name: 'pay.example Payment Credential', locale: 'en' }],
  transaction_data_types: {
    'urn:eudi:sca:eu.europa.ec:payment:single:1': {
      claims: [
        { path: ['transaction_id'], mandatory: true },
        {
          path: ['date_time'],
          value_type: 'iso_date_time',
          display: [
            { locale: 'de-DE', name: 'Datum' },
            { locale: 'en-GB', name: 'Date' },
          ],
        },
        {
          path: ['amount'],
          mandatory: true,
          value_type: 'iso_currency_amount',
          display: [
            { locale: 'de-DE', name: 'Betrag' },
            { locale: 'en-GB', name: 'Amount' },
          ],
        },
        {
          path: ['payee', 'name'],
          mandatory: true,
          display: [
            { locale: 'de-DE', name: 'Empfänger' },
            { locale: 'en-GB', name: 'Payee' },
          ],
        },
        { path: ['payee', 'id'], mandatory: true },
      ],
      ui_labels: {
        affirmative_action_label: [
          { locale: 'de-DE', value: 'Zahlung bestätigen' },
          { locale: 'en-GB', value: 'Confirm Payment' },
        ],
      },
    },
  },
}

export const openHorizonBankCredentialsData = {
  [weroScaData.credentialConfigurationId]: weroScaData,
  [weroScaThirdPartyData.credentialConfigurationId]: weroScaThirdPartyData,
}
