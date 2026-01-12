import { URN_SCA_PAYMENT } from '@animo-id/eudi-wallet-functionality'
import { OpenId4VciCredentialFormatProfile } from '@credo-ts/openid4vc'
import { AGENT_HOST } from '../constants.js'
import type { CredentialConfigurationDisplay, PlaygroundIssuerOptions, SdJwtConfiguration } from '../issuer.js'
import { dateToSeconds } from '../utils/date.js'

const issuerId = '7cc028a3-8ce2-432a-bf19-5621068586df'

const localizedCardNames = [
  {
    locale: 'en',
    name: 'Wero Card',
  },
  {
    locale: 'de',
    name: 'Wero Karte',
  },
  {
    locale: 'fr',
    name: 'Carte Wero',
  },
] as const

const commonWeroCardDisplay = {
  text_color: '#1D1C1C',
  background_color: '#fff48d',
  logo: {
    uri: `${AGENT_HOST}/assets/issuers/wero/issuer.svg`,
    alt_text: 'Wero',
  },
} as const

const localizedWeroCardDisplay = localizedCardNames.map((it) => ({
  ...commonWeroCardDisplay,
  ...it,
})) as [CredentialConfigurationDisplay, ...CredentialConfigurationDisplay[]]

const weroScaConfiguration = {
  format: OpenId4VciCredentialFormatProfile.SdJwtDc,
  vct: `${AGENT_HOST}/api/vct/${issuerId}/${encodeURI('openid4vc:credential:WeroSca')}`,
  scope: 'openid4vc:credential:WeroSca',
  cryptographic_binding_methods_supported: ['jwk'],
  credential_signing_alg_values_supported: ['ES256', 'EdDSA'],
  proof_types_supported: {
    // TODO: Remove jwt when attestation is supported in paradym, TS12 requires attestation
    jwt: {
      proof_signing_alg_values_supported: ['ES256', 'EdDSA'],
    },
    attestation: {
      proof_signing_alg_values_supported: ['ES256', 'EdDSA'],
      key_attestations_required: {
        key_storage: ['iso_18045_high'],
        user_authentication: ['iso_18045_high'],
      },
    },
  },
  credential_metadata: {
    display: localizedWeroCardDisplay,
    claims: [
      {
        path: ['account_holder_name'],
        mandatory: true,
        display: [
          { name: 'Account Holder', locale: 'en' },
          { name: 'Kontoinhaber', locale: 'de' },
          { name: 'Titulaire du compte', locale: 'fr' },
        ],
      },
      {
        path: ['iban'],
        mandatory: true,
        display: [
          { name: 'IBAN', locale: 'en' },
          { name: 'IBAN', locale: 'de' },
          { name: 'IBAN', locale: 'fr' },
        ],
      },
      {
        path: ['bic'],
        mandatory: true,
        display: [
          { name: 'BIC', locale: 'en' },
          { name: 'BIC', locale: 'de' },
          { name: 'Code BIC', locale: 'fr' },
        ],
      },
      {
        path: ['currency'],
        mandatory: true,
        display: [
          { name: 'Currency', locale: 'en' },
          { name: 'Währung', locale: 'de' },
          { name: 'Devise', locale: 'fr' },
        ],
      },
      {
        path: ['scheme'],
        mandatory: false,
        display: [
          { name: 'Payment Scheme', locale: 'en' },
          { name: 'Zahlungsverfahren', locale: 'de' },
          { name: 'Régime de paiement', locale: 'fr' },
        ],
      },
    ],
  },
  category: 'urn:eu:europa:ec:eudi:sua:sca',
  transaction_data_types: {
    'https://wero-wallet.eu/wero-payment': {
      schema: URN_SCA_PAYMENT,
      claims: [
        {
          path: ['payload', 'amount'],
          visualisation: 1,
          display: [
            { locale: 'en', name: 'Amount' },
            { locale: 'de', name: 'Betrag' },
            { locale: 'fr', name: 'Montant' },
          ],
        },
        {
          path: ['payload', 'currency'],
          visualisation: 1,
          display: [
            { locale: 'en', name: 'Currency' },
            { locale: 'de', name: 'Währung' },
            { locale: 'fr', name: 'Devise' },
          ],
        },
        {
          path: ['payload', 'payee', 'name'],
          visualisation: 1,
          display: [
            { locale: 'en', name: 'Payee' },
            { locale: 'de', name: 'Empfänger' },
            { locale: 'fr', name: 'Bénéficiaire' },
          ],
        },
        {
          path: ['payload', 'reference'],
          visualisation: 2,
          display: [
            { locale: 'en', name: 'Reference' },
            { locale: 'de', name: 'Verwendungszweck' },
            { locale: 'fr', name: 'Référence' },
          ],
        },
      ],

      ui_labels: {
        // [TS12] Mapped 'heading' -> 'transaction_title'
        transaction_title: [
          { lang: 'en', value: 'Confirm Payment' },
          { lang: 'de', value: 'Zahlung bestätigen' },
          { lang: 'fr', value: 'Confirmer le paiement' },
        ],

        // [TS12] Mapped 'confirm_button' -> 'affirmative_action_label'
        affirmative_action_label: [
          { lang: 'en', value: 'Pay' },
          { lang: 'de', value: 'Zahlen' },
          { lang: 'fr', value: 'Payer' },
        ],

        // [TS12] Mapped 'cancel_button' -> 'denial_action_label'
        denial_action_label: [
          { lang: 'en', value: 'Reject' },
          { lang: 'de', value: 'Ablehnen' },
          { lang: 'fr', value: 'Refuser' },
        ],

        // [TS12] Mapped 'authenticator_prompt' -> 'security_hint'
        security_hint: [
          { lang: 'en', value: 'Authenticate to sign this payment' },
          { lang: 'de', value: 'Authentifizieren Sie sich, um diese Zahlung zu signieren' },
          { lang: 'fr', value: 'Authentifiez-vous pour signer ce paiement' },
        ],
      },
    },
  },
  display: localizedWeroCardDisplay,
} satisfies SdJwtConfiguration

const now = new Date()
const expiry = new Date()
expiry.setFullYear(now.getFullYear() + 3)

const weroPayloadClaims = {
  account_holder_name: 'Erika Mustermann',
  iban: 'DE22123456781234567890',
  bic: 'WEROEQNX',
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

// TODO: Arf 2.7.3 section 2.6.4 requires "User identification and authentication, for example by presenting a PID" and attestation based proof (WUA) during issuance
export const weroIssuer = {
  tags: [localizedCardNames[0].name, 'TS12 Payment'],
  issuerId,
  credentialConfigurationsSupported: [
    {
      [OpenId4VciCredentialFormatProfile.SdJwtDc]: {
        configuration: weroScaConfiguration,
        data: weroScaData,
      },
    },
  ],
  display: [
    {
      name: 'Wero',
      logo: {
        url: `${AGENT_HOST}/assets/issuers/wero/issuer.svg`,
        uri: `${AGENT_HOST}/assets/issuers/wero/issuer.svg`,
      },
    },
  ],
} satisfies PlaygroundIssuerOptions

export const weroCredentialsData = {
  [weroScaData.credentialConfigurationId]: weroScaData,
}
