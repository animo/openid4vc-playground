import { Kms } from '@credo-ts/core'
import { OpenId4VciCredentialFormatProfile } from '@credo-ts/openid4vc'
import { AGENT_HOST } from '../constants.js'
import type { CredentialConfigurationDisplay, PlaygroundIssuerOptions, SdJwtConfiguration } from '../issuer.js'
import { localisedNames, localisedValues } from '../paso/metadata.js'
import type { StaticSdJwtSignInput } from '../types.js'
import { dateToSeconds } from '../utils/date.js'
import { getVctUrl } from '../utils/getVctUrl.js'
import { pasoRiskSignals, weroPaymentAttestationCategory, weroPaymentTransactionDataClaims } from './openHorizonBank.js'

/**
 * Kanaal Bank, a second bank with its own PaSO card, so the wallet has two payment cards to choose
 * from and a card whose metadata covers the mandate and generic types and accepts ad-hoc metadata.
 * Only issued from the PaSO edge cases page, so it has no `playgroundCategory`.
 */
export const kanaalBankIssuerId = 'b6a3f0d2-4c1e-4f7a-9d2b-3e8c5a1f7064'

const kanaalEverydayAccountScope = 'kanaal-everyday-account-paso-sd-jwt'

const kanaalBankLogo = {
  uri: `${AGENT_HOST}/assets/issuers/kanaal/issuer.png`,
  url: `${AGENT_HOST}/assets/issuers/kanaal/issuer.png`,
  alt_text: 'Kanaal Bank logo',
}

const kanaalEverydayAccountDisplay = {
  locale: 'en',
  name: 'Everyday account',
  text_color: '#FFFFFF',
  background_color: '#0B4F3C',
  logo: kanaalBankLogo,
} as const satisfies CredentialConfigurationDisplay

export const kanaalEverydayAccountConfiguration = {
  format: OpenId4VciCredentialFormatProfile.SdJwtDc,
  vct: getVctUrl(kanaalBankIssuerId, kanaalEverydayAccountScope),
  scope: kanaalEverydayAccountScope,
  cryptographic_binding_methods_supported: ['jwk'],
  credential_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  proof_types_supported: {
    jwt: { proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256] },
  },
  display: [kanaalEverydayAccountDisplay],
  credential_metadata: {
    display: [
      kanaalEverydayAccountDisplay,
      { ...kanaalEverydayAccountDisplay, locale: 'de', name: 'Alltagskonto' },
      { ...kanaalEverydayAccountDisplay, locale: 'fr', name: 'Compte courant' },
      { ...kanaalEverydayAccountDisplay, locale: 'nl', name: 'Betaalrekening' },
    ],
    claims: [
      { path: ['masked_iban'], mandatory: true, display: localisedNames('IBAN', 'IBAN', 'IBAN', 'IBAN') },
      { path: ['sub'], mandatory: true },
      { path: ['category'], mandatory: true },
    ],
  },
  credential_metadata_uri: `${AGENT_HOST}/api/paso-credential-metadata/kanaal-bank`,
} satisfies SdJwtConfiguration

const now = new Date()
const expiry = new Date()
expiry.setFullYear(now.getFullYear() + 3)

/** Not selectively disclosable, like the WPA. `sub`, `iss` and `cnf` are added at issuance. */
const kanaalEverydayAccountData = {
  credentialConfigurationId: kanaalEverydayAccountConfiguration.scope,
  format: kanaalEverydayAccountConfiguration.format,
  credential: {
    payload: {
      vct: kanaalEverydayAccountConfiguration.vct,
      category: weroPaymentAttestationCategory,
      masked_iban: 'NL20**********7781',
      iat: dateToSeconds(now),
      exp: dateToSeconds(expiry),
    },
  },
} as const satisfies StaticSdJwtSignInput

export const kanaalBankIssuer = {
  tags: ['PaSO Payment'],
  issuerId: kanaalBankIssuerId,
  credentialConfigurationsSupported: [
    {
      [OpenId4VciCredentialFormatProfile.SdJwtDc]: {
        configuration: kanaalEverydayAccountConfiguration,
        data: kanaalEverydayAccountData,
        playground: { hidden: true },
      },
    },
  ],
  display: [{ name: 'Kanaal Bank', logo: kanaalBankLogo }],
} satisfies PlaygroundIssuerOptions

export const kanaalBankCredentialsData = {
  [kanaalEverydayAccountData.credentialConfigurationId]: kanaalEverydayAccountData,
}

const kanaalSecurityHint = localisedValues(
  'Kanaal Bank will never phone you to ask for an approval. Only approve payments you started yourself.',
  'Die Kanaal Bank ruft Sie nie an, um eine Freigabe zu verlangen. Geben Sie nur Zahlungen frei, die Sie selbst veranlasst haben.',
  "Kanaal Bank ne vous appellera jamais pour demander une approbation. N'approuvez que les paiements que vous avez initiés.",
  'Kanaal Bank belt u nooit om een goedkeuring te vragen. Keur alleen betalingen goed die u zelf hebt gestart.'
)

const denialActionLabel = localisedValues('Decline', 'Ablehnen', 'Refuser', 'Weigeren')

const payeeNameDisplay = localisedNames('Payee', 'Empfänger', 'Bénéficiaire', 'Begunstigde')
const payeeLogoDisplay = localisedNames('Payee logo', 'Logo des Empfängers', 'Logo du bénéficiaire', 'Logo begunstigde')
const amountDisplay = localisedNames('Amount', 'Betrag', 'Montant', 'Bedrag')

/**
 * Kanaal Bank's PaSO transaction data types: the Wero form of the payment type (so one Wero request
 * can be authorised with either bank's card) with Kanaal's own labels, the Mandate rulebook, and the
 * Generic rulebook with the custom claims the edge cases page sends.
 */
export const kanaalBankTransactionDataTypes = {
  'urn:paso:sca:global:payment:1': {
    claims: weroPaymentTransactionDataClaims,
    ui_labels: {
      transaction_title: localisedValues(
        'Approve Wero payment',
        'Wero-Zahlung freigeben',
        'Approuver le paiement Wero',
        'Wero-betaling goedkeuren'
      ),
      affirmative_action_label: localisedValues('Approve', 'Freigeben', 'Approuver', 'Goedkeuren'),
      payment_account_label: localisedValues('Pay from', 'Bezahlen von', 'Payer depuis', 'Betalen vanaf'),
      denial_action_label: denialActionLabel,
      security_hint: kanaalSecurityHint,
    },
    ...pasoRiskSignals,
  },
  // The Mandate rulebook's claim table, in its normative order, with the embedded payment in the
  // Basic Payments form. The nested payment claims are optional because the payment itself is.
  'urn:paso:sca:global:mandate:1': {
    claims: [
      { path: ['transaction_id'], mandatory: false },
      {
        path: ['mandate_id'],
        mandatory: true,
        display: localisedNames('Mandate reference', 'Mandatsreferenz', 'Référence du mandat', 'Machtigingskenmerk'),
      },
      {
        path: ['mandatee', 'name'],
        mandatory: true,
        display: localisedNames('Authorised party', 'Berechtigte Partei', 'Partie autorisée', 'Gemachtigde'),
      },
      { path: ['mandatee', 'id'], mandatory: false },
      {
        path: ['mandatee', 'logo'],
        mandatory: false,
        value_type: 'image',
        display: localisedNames(
          'Logo of the authorised party',
          'Logo der berechtigten Partei',
          'Logo de la partie autorisée',
          'Logo van de gemachtigde'
        ),
      },
      { path: ['mandatee', 'logo#integrity'], mandatory: false },
      {
        path: ['action'],
        mandatory: true,
        display: localisedNames('Authorised action', 'Erlaubte Aktion', 'Action autorisée', 'Toegestane handeling'),
      },
      {
        path: ['conditions'],
        mandatory: false,
        value_type: 'mini_markdown',
        display: localisedNames('Conditions', 'Bedingungen', 'Conditions', 'Voorwaarden'),
      },
      {
        path: ['max_amount'],
        mandatory: false,
        value_type: 'iso_currency_amount',
        display: localisedNames(
          'Maximum amount per debit',
          'Höchstbetrag pro Abbuchung',
          'Montant maximal par prélèvement',
          'Maximumbedrag per afschrijving'
        ),
      },
      {
        path: ['max_count'],
        mandatory: false,
        display: localisedNames(
          'Maximum number of debits',
          'Maximale Anzahl Abbuchungen',
          'Nombre maximal de prélèvements',
          'Maximaal aantal afschrijvingen'
        ),
      },
      { path: ['period'], mandatory: false, display: localisedNames('Period', 'Zeitraum', 'Période', 'Periode') },
      {
        path: ['valid_from'],
        mandatory: false,
        value_type: 'iso_date',
        display: localisedNames('Valid from', 'Gültig ab', 'Valable à partir du', 'Geldig vanaf'),
      },
      {
        path: ['valid_until'],
        mandatory: true,
        value_type: 'iso_date',
        display: localisedNames('Valid until', 'Gültig bis', "Valable jusqu'au", 'Geldig tot en met'),
      },
      { path: ['payment_payload'], mandatory: false },
      { path: ['payment_payload', 'transaction_id'], mandatory: false },
      {
        path: ['payment_payload', 'amount'],
        mandatory: false,
        value_type: 'iso_currency_amount',
        display: localisedNames('First debit', 'Erste Abbuchung', 'Premier prélèvement', 'Eerste afschrijving'),
      },
      { path: ['payment_payload', 'payee', 'name'], mandatory: false, display: payeeNameDisplay },
      { path: ['payment_payload', 'payee', 'id'], mandatory: false },
      { path: ['payment_payload', 'payee', 'logo'], mandatory: false, value_type: 'image', display: payeeLogoDisplay },
      { path: ['payment_payload', 'payee', 'logo#integrity'], mandatory: false },
    ],
    ui_labels: {
      transaction_title: localisedValues(
        'Set up a direct debit mandate',
        'Lastschriftmandat einrichten',
        'Mettre en place un mandat de prélèvement',
        'Machtiging voor automatische incasso instellen'
      ),
      affirmative_action_label: localisedValues(
        'Authorise mandate',
        'Mandat erteilen',
        'Autoriser le mandat',
        'Machtiging geven'
      ),
      payment_account_label: localisedValues('Debit from', 'Abbuchen von', 'Débiter depuis', 'Afschrijven van'),
      denial_action_label: denialActionLabel,
      security_hint: kanaalSecurityHint,
    },
    ...pasoRiskSignals,
  },
  // No `transaction_title`, so the wallet falls back to its own.
  'urn:paso:sca:global:generic:1': {
    claims: [
      { path: ['transaction_id'], mandatory: true },
      {
        path: ['transfer'],
        mandatory: false,
        // `{2}` and `{3}` are the claims at those indexes of this array: `amount` and `beneficiary`.
        display: localisedNames(
          'Transfer {2} to {3}',
          '{2} an {3} überweisen',
          'Virement de {2} à {3}',
          '{2} overmaken naar {3}'
        ).map((entry) => ({ ...entry, display_type: 'template:mini_markdown' })),
      },
      { path: ['amount'], mandatory: false, value_type: 'iso_currency_amount', display: amountDisplay },
      {
        path: ['beneficiary'],
        mandatory: false,
        display: localisedNames('Beneficiary', 'Begünstigter', 'Bénéficiaire', 'Begunstigde'),
      },
      {
        path: ['execution_date'],
        mandatory: false,
        value_type: 'iso_date_time',
        display: localisedNames('Executed on', 'Ausgeführt am', 'Exécuté le', 'Uitgevoerd op'),
      },
      {
        path: ['merchant_website'],
        mandatory: false,
        value_type: 'url',
        display: localisedNames(
          'Merchant website',
          'Website des Händlers',
          'Site du marchand',
          'Website van de verkoper'
        ),
      },
      {
        path: ['order_reference'],
        mandatory: false,
        display: localisedNames(
          'No order reference',
          'Keine Bestellreferenz',
          'Aucune référence de commande',
          'Geen bestelreferentie'
        ),
      },
    ],
    ui_labels: {
      affirmative_action_label: localisedValues('Confirm', 'Bestätigen', 'Confirmer', 'Bevestigen'),
      denial_action_label: denialActionLabel,
      security_hint: kanaalSecurityHint,
    },
    ...pasoRiskSignals,
  },
}
