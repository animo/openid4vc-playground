import { Kms } from '@credo-ts/core'
import { OpenId4VciCredentialFormatProfile } from '@credo-ts/openid4vc'
import { agent } from '../agent.js'
import { AGENT_HOST } from '../constants.js'
import type { CredentialConfigurationDisplay, PlaygroundIssuerOptions, SdJwtConfiguration } from '../issuer.js'
import type { StaticSdJwtSignInput } from '../types.js'
import { dateToSeconds } from '../utils/date.js'

export const openHorizonIssuerId = '7cc028a3-8ce2-432a-bf19-5621068586df'

const weroCardDisplay = {
  locale: 'en',
  name: 'Wero Bank Account',
  text_color: '#1D1C1C',
  background_color: '#fff48d',
  background_image: {
    uri: `${AGENT_HOST}/assets/credentials/wero_background.jpeg`,
    url: `${AGENT_HOST}/assets/credentials/wero_background.jpeg`,
  },
} as const satisfies CredentialConfigurationDisplay

const weroCardThirdPartyDisplay = {
  locale: 'en',
  name: 'Wero Bank Account (Third Party)',
  text_color: '#1D1C1C',
  background_color: '#fff48d',
  background_image: {
    uri: `${AGENT_HOST}/assets/credentials/wero_background.jpeg`,
    url: `${AGENT_HOST}/assets/credentials/wero_background.jpeg`,
  },
} as const satisfies CredentialConfigurationDisplay

/**
 * Claim metadata for the Wero card, so a wallet can label its attributes in the user's language.
 *
 * Without this the wallet has nothing to go on and falls back to prettifying the claim name, which
 * turns `payment_network` into "Payment network" in English and leaves it that way everywhere else.
 *
 * Two notes on the locales. `sv`/`sq` are the ISO codes for Swedish and Albanian, and `sw`/`al` are
 * the identifiers the Paradym wallet uses for those two catalogues — a wallet matches a `display`
 * entry on its own locale identifier, so both are served or those users would silently get English.
 * And `iban`/`bic` carry a single untagged entry: the acronyms are the same in every language, and
 * an entry without a `locale` is exactly the default a wallet falls back to.
 */
const weroClaimsMetadata: NonNullable<SdJwtConfiguration['credential_metadata']>['claims'] = [
  {
    path: ['account_holder'],
    display: [
      { locale: 'en', name: 'Account holder' },
      { locale: 'nl', name: 'Rekeninghouder' },
      { locale: 'de', name: 'Kontoinhaber' },
      { locale: 'fr', name: 'Titulaire du compte' },
      { locale: 'pt', name: 'Titular da conta' },
      { locale: 'fi', name: 'Tilinhaltija' },
      { locale: 'sv', name: 'Kontoinnehavare' },
      { locale: 'sw', name: 'Kontoinnehavare' },
      { locale: 'sq', name: 'Zotëruesi i llogarisë' },
      { locale: 'al', name: 'Zotëruesi i llogarisë' },
    ],
  },
  { path: ['iban'], display: [{ name: 'IBAN' }] },
  { path: ['bic'], display: [{ name: 'BIC' }] },
  {
    path: ['currency'],
    display: [
      { locale: 'en', name: 'Currency' },
      { locale: 'nl', name: 'Valuta' },
      { locale: 'de', name: 'Währung' },
      { locale: 'fr', name: 'Devise' },
      { locale: 'pt', name: 'Moeda' },
      { locale: 'fi', name: 'Valuutta' },
      { locale: 'sv', name: 'Valuta' },
      { locale: 'sw', name: 'Valuta' },
      { locale: 'sq', name: 'Monedha' },
      { locale: 'al', name: 'Monedha' },
    ],
  },
  {
    path: ['payment_network'],
    display: [
      { locale: 'en', name: 'Payment network' },
      { locale: 'nl', name: 'Betaalnetwerk' },
      { locale: 'de', name: 'Zahlungsnetzwerk' },
      { locale: 'fr', name: 'Réseau de paiement' },
      { locale: 'pt', name: 'Rede de pagamentos' },
      { locale: 'fi', name: 'Maksuverkko' },
      { locale: 'sv', name: 'Betalningsnätverk' },
      { locale: 'sw', name: 'Betalningsnätverk' },
      { locale: 'sq', name: 'Rrjeti i pagesave' },
      { locale: 'al', name: 'Rrjeti i pagesave' },
    ],
  },
]

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
  credential_metadata: { display: [weroCardDisplay], claims: weroClaimsMetadata },
  credential_metadata_uri: `${AGENT_HOST}/payments-credential-metadata`,
} satisfies SdJwtConfiguration

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
  credential_metadata: { display: [weroCardThirdPartyDisplay], claims: weroClaimsMetadata },
  credential_metadata_uri: `${AGENT_HOST}/payments-credential-metadata`,
} satisfies SdJwtConfiguration

const weroPasoCardDisplay = {
  locale: 'en',
  name: 'Wero Bank Account (PaSO)',
  text_color: '#1D1C1C',
  background_color: '#fff48d',
  background_image: {
    uri: `${AGENT_HOST}/assets/credentials/wero_background.jpeg`,
    url: `${AGENT_HOST}/assets/credentials/wero_background.jpeg`,
  },
} as const satisfies CredentialConfigurationDisplay

/**
 * A PaSO Credential, as opposed to the TS 12 SCA Attestations above.
 *
 * Separate `vct` and separate `credential_metadata_uri` on purpose: PaSO moved the payload's
 * structural authority from the claims metadata to the Transaction Data Type Rulebook and requires
 * the metadata JWT to be kept in signed form, so the two metadata documents are not interchangeable
 * and a wallet has to be able to tell which kind of credential it holds.
 */
export const weroPasoConfiguration = {
  format: OpenId4VciCredentialFormatProfile.SdJwtDc,
  vct: 'eu.europa.wero.card.paso',
  scope: 'wero-card-paso-sd-jwt',
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
  display: [weroPasoCardDisplay],
  credential_metadata: { display: [weroPasoCardDisplay], claims: weroClaimsMetadata },
  credential_metadata_uri: `${AGENT_HOST}/paso-credential-metadata`,
} satisfies SdJwtConfiguration

const now = new Date()
const expiry = new Date()
expiry.setFullYear(now.getFullYear() + 3)

const weroPayloadClaims = {
  account_holder: '1234567890',
  iban: 'GB33BUKB20201555555555',
  bic: 'SNSBNL2AXXX',
  currency: 'EUR',
  payment_network: 'Wero',
}

const weroPayloadThirdPartyClaims = {
  account_holder: '1234567890',
  iban: 'GB33BUKB20201555555555',
  bic: 'SNSBNL2AXXX',
  currency: 'EUR',
  payment_network: 'Wero',
}

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
} as const satisfies StaticSdJwtSignInput

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
} as const satisfies StaticSdJwtSignInput

const weroPasoData = {
  credentialConfigurationId: weroPasoConfiguration.scope,
  format: weroPasoConfiguration.format,
  credential: {
    payload: {
      ...weroPayloadClaims,
      iat: dateToSeconds(now),
      nbf: dateToSeconds(now),
      exp: dateToSeconds(expiry),
      vct: weroPasoConfiguration.vct,
    },
    disclosureFrame: {
      _sd: Object.keys(weroPayloadClaims),
    },
  },
} as const satisfies StaticSdJwtSignInput

export const openHorizonBankIssuer = {
  tags: [weroCardDisplay.name, 'TS12 Payment', 'PaSO Payment'],
  issuerId: openHorizonIssuerId,
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
    {
      [OpenId4VciCredentialFormatProfile.SdJwtDc]: {
        configuration: weroPasoConfiguration,
        data: weroPasoData,
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

export async function updatePaymentStatusForWeroCredential(
  jti: string,
  paymentTransactionId: string,
  amount: number
): Promise<void> {
  const statusCode = amount > 100 ? 'RJCT' : 'ACSC'

  const credentialTokenRecord = await agent.genericRecords.findById(`wero-credential-token-${jti}`)
  if (!credentialTokenRecord) {
    agent.config.logger.warn(`openHorizonBank: no credential token record found for jti ${jti}`)
    return
  }

  const paymentRecord = await agent.genericRecords.findById(`transaction-status-${paymentTransactionId}`)
  if (paymentRecord?.content.statusCode !== 'PDNG') {
    agent.config.logger.warn(
      `openHorizonBank: payment record ${paymentTransactionId} not found or not PDNG (current: ${paymentRecord?.content.statusCode})`
    )
    return
  }

  paymentRecord.content.transaction_status_token = credentialTokenRecord.content.transaction_status_token
  await agent.genericRecords.update(paymentRecord)
  agent.config.logger.info(
    `openHorizonBank: payment ${paymentTransactionId} token set (status PDNG), flipping to ${statusCode} in 30s`
  )

  setTimeout(async () => {
    const latest = await agent.genericRecords.findById(`transaction-status-${paymentTransactionId}`)
    if (latest?.content.statusCode !== 'PDNG') {
      agent.config.logger.warn(
        `openHorizonBank: payment ${paymentTransactionId} no longer PDNG at flip time (current: ${latest?.content.statusCode})`
      )
      return
    }
    latest.content.statusCode = statusCode
    await agent.genericRecords.update(latest)
    agent.config.logger.info(`openHorizonBank: payment ${paymentTransactionId} updated to ${statusCode}`)
  }, 20_000)
}

export const openHorizonBankCredentialsData = {
  [weroScaData.credentialConfigurationId]: weroScaData,
  [weroScaThirdPartyData.credentialConfigurationId]: weroScaThirdPartyData,
  [weroPasoData.credentialConfigurationId]: weroPasoData,
}

/**
 * The PaSO `transaction_data_types` entry for the Basic Payments rulebook.
 *
 * https://aptitude-consortium.github.io/payments-and-sca-for-openid/draft-2/rulebooks/transaction_data/Payment/
 *
 * The rulebook fixes both the claim set and its order — "the table order is the normative claim
 * order" — so this is a transcription of it, not a design choice. Six claims, against TS 12's
 * nineteen, and `payee.id` now means the Payee's tax or business registry number.
 *
 * `ui_labels` is served even though a wallet with a dedicated payment UI may ignore most of it
 * ([PaSO Proof Metadata] Section 3.2), because `security_hint` is the exception that no wallet may
 * replace, and because a wallet without a dedicated UI needs the rest.
 *
 * The risk signals are enumerated directly rather than by referencing a profile, which
 * [PaSO Risk Signals] Section 4.1 step 3 provides for. The published Default profile would be the
 * more idiomatic declaration, but it deliberately omits `amr` — the one signal a Strong Customer
 * Authentication policy turns on — and adds six measured signals a wallet can only report as
 * `unavailable` here. Enumerating what a first-party SCA deployment actually needs keeps the
 * declaration honest.
 *
 * `encrypted` is trigger 2 of [PaSO Risk Signals] Section 7.2: the wallet encrypts the whole
 * `risk_signals` array to the key this issuer publishes under `risk_signals_encryption_keys` (see
 * `paso/riskSignalsEncryption.ts`) and the Authorizing Party decrypts it to run the per-signal
 * checks. Section 7.8 cautions against combining encryption with `amr` *in a third-party flow*,
 * because an Authorizing Party that is not the issuer could then no longer see how the user
 * authenticated. This deployment is both, so the caution does not apply — and the combination is
 * exactly what makes the split verification of Section 6.1 visible in the playground.
 */
export const openHorizonBankPasoCredentialMetadata = {
  display: [
    { name: 'Wero Bank Account (PaSO)', locale: 'en' },
    { name: 'Wero Bankkonto (PaSO)', locale: 'de' },
    { name: 'Wero Bankrekening (PaSO)', locale: 'nl' },
  ],
  transaction_data_types: {
    'urn:paso:sca:global:payment:1': {
      claims: [
        { path: ['transaction_id'] },
        {
          path: ['amount'],
          mandatory: true,
          value_type: 'iso_currency_amount',
          display: [
            { locale: 'en', name: 'Amount' },
            { locale: 'de', name: 'Betrag' },
            { locale: 'nl', name: 'Bedrag' },
          ],
        },
        {
          path: ['payee', 'name'],
          mandatory: true,
          display: [
            { locale: 'en', name: 'Payee' },
            { locale: 'de', name: 'Empfänger' },
            { locale: 'nl', name: 'Begunstigde' },
          ],
        },
        { path: ['payee', 'id'], mandatory: true },
        {
          path: ['payee', 'logo'],
          value_type: 'image',
          display: [
            { locale: 'en', name: 'Payee logo' },
            { locale: 'de', name: 'Logo des Empfängers' },
            { locale: 'nl', name: 'Logo van de begunstigde' },
          ],
        },
        { path: ['payee', 'logo#integrity'] },
      ],
      ui_labels: {
        transaction_title: [
          { locale: 'en', value: 'Confirm Payment' },
          { locale: 'de', value: 'Zahlung bestätigen' },
          { locale: 'nl', value: 'Betaling bevestigen' },
        ],
        affirmative_action_label: [
          { locale: 'en', value: 'Pay' },
          { locale: 'de', value: 'Bezahlen' },
          { locale: 'nl', value: 'Betalen' },
        ],
        denial_action_label: [
          { locale: 'en', value: 'Cancel' },
          { locale: 'de', value: 'Abbrechen' },
          { locale: 'nl', value: 'Annuleren' },
        ],
        security_hint: [
          { locale: 'en', value: 'Open Horizon Bank will never ask you to authorize a payment over the phone.' },
          {
            locale: 'de',
            value: 'Die Open Horizon Bank wird Sie niemals telefonisch um eine Zahlungsfreigabe bitten.',
          },
          {
            locale: 'nl',
            value: 'Open Horizon Bank vraagt u nooit telefonisch om een betaling goed te keuren.',
          },
        ],
      },
      risk_signals: [
        { type: 'urn:paso:risk:global:response_mode:1', required: true, max_age: 600 },
        { type: 'urn:paso:risk:global:amr:1', required: true, max_age: 600 },
      ],
      encrypted: true,
    },
  },
}
