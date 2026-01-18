import { URN_SCA_GENERIC, URN_SCA_PAYMENT, type ZScaAttestationExt } from '@animo-id/eudi-wallet-functionality'
import { OpenId4VciCredentialFormatProfile } from '@credo-ts/openid4vc'
import { AGENT_HOST } from '../constants.js'
import type { CredentialConfigurationDisplay, PlaygroundIssuerOptions, SdJwtConfiguration } from '../issuer.js'
import { dateToSeconds } from '../utils/date.js'

const issuerId = '7cc028a3-8ce2-432a-bf19-5621068586df'

const localizedCardNames = [
  {
    locale: 'en',
    name: 'Wero',
  },
  {
    locale: 'de',
    name: 'Wero',
  },
  {
    locale: 'fr',
    name: 'Wero',
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

const commonsSJwtDisplay = {
  ...commonWeroCardDisplay,
  rendering: {
    simple: {
      ...commonWeroCardDisplay,
    },
  },
}

const localizedWeroCardDisplay = localizedCardNames.map((it) => ({
  ...commonsSJwtDisplay,
  ...it,
})) as unknown as [CredentialConfigurationDisplay, ...CredentialConfigurationDisplay[]]

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
        path: ['account_holder_id'],
        mandatory: true,
        display: [
          { name: 'Account Holder ID', locale: 'en' },
          { name: 'Kontoinhaber-ID', locale: 'de' },
          { name: 'ID du titulaire du compte', locale: 'fr' },
        ],
      },
      {
        path: ['account_id'],
        mandatory: true,
        display: [
          { name: 'Account ID', locale: 'en' },
          { name: 'Konto-ID', locale: 'de' },
          { name: 'ID du compte', locale: 'fr' },
        ],
      },
      {
        path: ['email'],
        mandatory: true,
        display: [
          { name: 'Email', locale: 'en' },
          { name: 'E-Mail', locale: 'de' },
          { name: 'E-mail', locale: 'fr' },
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
    ],
  },
  category: 'urn:eu:europa:ec:eudi:sua:sca',
  transaction_data_types: [
    {
      type: URN_SCA_PAYMENT,
      claims: [
        {
          path: ['payload', 'date_time'],
          display: [
            { locale: 'en', name: 'Date & Time' },
            { locale: 'de', name: 'Datum & Uhrzeit' },
            { locale: 'fr', name: 'Date et heure' },
          ],
        },
        {
          path: ['payload', 'payee', 'name'],
          display: [
            { locale: 'en', name: 'Payee Name' },
            { locale: 'de', name: 'Empfängername' },
            { locale: 'fr', name: 'Nom du bénéficiaire' },
          ],
        },
        {
          path: ['payload', 'payee', 'id'],
          display: [
            { locale: 'en', name: 'Payee ID' },
            { locale: 'de', name: 'Empfänger-ID' },
            { locale: 'fr', name: 'Identifiant du bénéficiaire' },
          ],
        },
        {
          path: ['payload', 'payee', 'logo'],
          display: [
            { locale: 'en', name: 'Payee Logo' },
            { locale: 'de', name: 'Empfänger-Logo' },
            { locale: 'fr', name: 'Logo du bénéficiaire' },
          ],
        },
        {
          path: ['payload', 'payee', 'website'],
          display: [
            { locale: 'en', name: 'Payee Website' },
            { locale: 'de', name: 'Empfänger-Webseite' },
            { locale: 'fr', name: 'Site web du bénéficiaire' },
          ],
        },
        {
          path: ['payload', 'pisp', 'legal_name'],
          display: [
            { locale: 'en', name: 'PISP Legal Name' },
            { locale: 'de', name: 'Rechtlicher Name (PISP)' },
            { locale: 'fr', name: 'Dénomination sociale (PISP)' },
          ],
        },
        {
          path: ['payload', 'pisp', 'brand_name'],
          display: [
            { locale: 'en', name: 'PISP Brand Name' },
            { locale: 'de', name: 'Markenname (PISP)' },
            { locale: 'fr', name: 'Nom commercial (PISP)' },
          ],
        },
        {
          path: ['payload', 'pisp', 'domain_name'],
          display: [
            { locale: 'en', name: 'PISP Domain Name' },
            { locale: 'de', name: 'Domainname (PISP)' },
            { locale: 'fr', name: 'Nom de domaine (PISP)' },
          ],
        },
        {
          path: ['payload', 'execution_date'],
          display: [
            { locale: 'en', name: 'Execution Date' },
            { locale: 'de', name: 'Ausführungsdatum' },
            { locale: 'fr', name: "Date d'exécution" },
          ],
        },
        {
          path: ['payload', 'currency'],
          display: [
            { locale: 'en', name: 'Currency' },
            { locale: 'de', name: 'Währung' },
            { locale: 'fr', name: 'Devise' },
          ],
        },
        {
          path: ['payload', 'amount'],
          display: [
            { locale: 'en', name: 'Amount' },
            { locale: 'de', name: 'Betrag' },
            { locale: 'fr', name: 'Montant' },
          ],
        },
        {
          path: ['payload', 'amount_estimated'],
          display: [
            { locale: 'en', name: 'Estimated Amount' },
            { locale: 'de', name: 'Geschätzter Betrag' },
            { locale: 'fr', name: 'Montant estimé' },
          ],
        },
        {
          path: ['payload', 'amount_earmarked'],
          display: [
            { locale: 'en', name: 'Earmarked Amount' },
            { locale: 'de', name: 'Reservierter Betrag' },
            { locale: 'fr', name: 'Montant réservé' },
          ],
        },
        {
          path: ['payload', 'sct_inst'],
          display: [
            { locale: 'en', name: 'Instant Payment' },
            { locale: 'de', name: 'Echtzeitüberweisung' },
            { locale: 'fr', name: 'Virement instantané' },
          ],
        },
        {
          path: ['payload', 'recurrence', 'start_date'],
          display: [
            { locale: 'en', name: 'Start Date' },
            { locale: 'de', name: 'Startdatum' },
            { locale: 'fr', name: 'Date de début' },
          ],
        },
        {
          path: ['payload', 'recurrence', 'end_date'],
          display: [
            { locale: 'en', name: 'End Date' },
            { locale: 'de', name: 'Enddatum' },
            { locale: 'fr', name: 'Date de fin' },
          ],
        },
        {
          path: ['payload', 'recurrence', 'number'],
          display: [
            { locale: 'en', name: 'Number of Payments' },
            { locale: 'de', name: 'Anzahl der Zahlungen' },
            { locale: 'fr', name: "Nombre d'échéances" },
          ],
        },
        {
          path: ['payload', 'recurrence', 'frequency'],
          display: [
            { locale: 'en', name: 'Frequency' },
            { locale: 'de', name: 'Zahlungsintervall' },
            { locale: 'fr', name: 'Périodicité' },
          ],
        },
        {
          path: ['payload', 'recurrence', 'mit_options', 'amount_variable'],
          display: [
            { locale: 'en', name: 'Variable Amount' },
            { locale: 'de', name: 'Variabler Betrag' },
            { locale: 'fr', name: 'Montant variable' },
          ],
        },
        {
          path: ['payload', 'recurrence', 'mit_options', 'min_amount'],
          display: [
            { locale: 'en', name: 'Min Amount' },
            { locale: 'de', name: 'Mindestbetrag' },
            { locale: 'fr', name: 'Montant minimum' },
          ],
        },
        {
          path: ['payload', 'recurrence', 'mit_options', 'max_amount'],
          display: [
            { locale: 'en', name: 'Max Amount' },
            { locale: 'de', name: 'Höchstbetrag' },
            { locale: 'fr', name: 'Montant maximum' },
          ],
        },
        {
          path: ['payload', 'recurrence', 'mit_options', 'total_amount'],
          display: [
            { locale: 'en', name: 'Total Amount' },
            { locale: 'de', name: 'Gesamtbetrag' },
            { locale: 'fr', name: 'Montant total' },
          ],
        },
        {
          path: ['payload', 'recurrence', 'mit_options', 'initial_amount'],
          display: [
            { locale: 'en', name: 'Initial Amount' },
            { locale: 'de', name: 'Erster Betrag' },
            { locale: 'fr', name: 'Montant initial' },
          ],
        },
        {
          path: ['payload', 'recurrence', 'mit_options', 'initial_amount_number'],
          display: [
            { locale: 'en', name: 'Number of Initial Payments' },
            { locale: 'de', name: 'Anzahl der ersten Beträge' },
            { locale: 'fr', name: 'Nombre de montants initiaux' },
          ],
        },
        {
          path: ['payload', 'recurrence', 'mit_options', 'apr'],
          display: [
            { locale: 'en', name: 'APR' },
            { locale: 'de', name: 'Effektiver Jahreszins' },
            { locale: 'fr', name: 'TAEG' },
          ],
        },
      ],

      ui_labels: {
        transaction_title: [
          { locale: 'en', value: 'Confirm Payment' },
          { locale: 'de', value: 'Zahlung bestätigen' },
          { locale: 'fr', value: 'Confirmer le paiement' },
        ],
        affirmative_action_label: [
          { locale: 'en', value: 'Pay' },
          { locale: 'de', value: 'Zahlen' },
          { locale: 'fr', value: 'Payer' },
        ],
        denial_action_label: [
          { locale: 'en', value: 'Reject' },
          { locale: 'de', value: 'Ablehnen' },
          { locale: 'fr', value: 'Refuser' },
        ],
      },
    },
    {
      type: URN_SCA_GENERIC,
      subtype: 'login',
      claims: [
        {
          path: ['payload', 'service'],
          display: [
            { locale: 'en', name: 'Log in to service' },
            { locale: 'de', name: 'Anmelden bei Dienst' },
            { locale: 'fr', name: 'Connexion au service' },
          ],
        },
        {
          path: ['payload', 'ip_address'],
          display: [
            { locale: 'en', name: 'Requesting from' },
            { locale: 'de', name: 'Anfrage von' },
            { locale: 'fr', name: 'Demande de' },
          ],
        },
      ],
      ui_labels: {
        transaction_title: [
          { locale: 'en', value: 'Login to your Account' },
          { locale: 'de', value: 'Anmelden bei Ihrem Konto' },
          { locale: 'fr', value: 'Connectez-vous à votre compte' },
        ],
        affirmative_action_label: [
          { locale: 'en', value: 'Login' },
          { locale: 'de', value: 'Anmelden' },
          { locale: 'fr', value: 'Se connecter' },
        ],
        denial_action_label: [
          { locale: 'en', value: 'Cancel' },
          { locale: 'de', value: 'Abbrechen' },
          { locale: 'fr', value: 'Annuler' },
        ],
        security_hint: [
          {
            locale: 'en',
            value:
              '⚠️ Security Alert\nWe will NEVER ask for your Password, PIN, or OTP. If you received a call or text asking for these, hang up.\nCheck the URL: Ensure you are at https://www.yourbank.com.\nNever approve a login you did not initiate.',
          },
          {
            locale: 'de',
            value:
              '⚠️ Sicherheitswarnung\nWir fragen NIEMALS nach Passwort, PIN oder OTP. Bei Anrufen/SMS dazu sofort auflegen.\nURL prüfen: Sind Sie auf https://www.yourbank.com?\nBestätigen Sie nie einen Login, den Sie nicht selbst gestartet haben.',
          },
          {
            locale: 'fr',
            value:
              "⚠️ Alerte de sécurité\nNous ne demanderons JAMAIS votre mot de passe, PIN ou OTP. Si on vous les demande, raccrochez.\nVérifiez l'URL : êtes-vous sur https://www.yourbank.com ?\nNe validez jamais une connexion que vous n'avez pas initiée.",
          },
        ],
      },
    },
    {
      type: URN_SCA_GENERIC,
      subtype: 'increase_spending_limit',
      claims: [
        {
          path: ['payload', 'old_spending_limit'],
          display: [
            { locale: 'en', name: 'Old Spending Limit' },
            { locale: 'de', name: 'Altes Ausgabenlimit' },
            { locale: 'fr', name: 'Ancienne limite de dépenses' },
          ],
        },
        {
          path: ['payload', 'new_spending_limit'],
          display: [
            { locale: 'en', name: 'New Spending Limit' },
            { locale: 'de', name: 'Neues Ausgabenlimit' },
            { locale: 'fr', name: 'Nouvelle limite de dépenses' },
          ],
        },
      ],
      ui_labels: {
        transaction_title: [
          { locale: 'en', value: 'Increase Spending Limit' },
          { locale: 'de', value: 'Ausgabenlimit erhöhen' },
          { locale: 'fr', value: 'Augmenter la limite de dépenses' },
        ],
        affirmative_action_label: [
          { locale: 'en', value: 'Confirm' },
          { locale: 'de', value: 'Bestätigen' },
          { locale: 'fr', value: 'Confirmer' },
        ],
        denial_action_label: [
          { locale: 'en', value: 'Reject' },
          { locale: 'de', value: 'Ablehnen' },
          { locale: 'fr', value: 'Refuser' },
        ],
        security_hint: [
          {
            locale: 'en',
            value:
              '🛑 STOP: Fraud Warning\nAre you increasing this limit because someone told you to? Fraudsters often claim your money is "unsafe" and ask you to move it.\nThis is a SCAM. We will never ask you to move money.\nYou could lose this money forever.',
          },
          {
            locale: 'de',
            value:
              '🛑 STOPP: Betrugswarnung\nErhöhen Sie das Limit auf Anweisung? Betrüger behaupten oft, Ihr Geld sei "unsicher" und bitten um Überweisung.\nDas ist BETRUG. Wir bitten nie darum, Geld zu verschieben.\nSie könnten Ihr Geld dauerhaft verlieren.',
          },
          {
            locale: 'fr',
            value:
              "🛑 STOP : Alerte Fraude\nAugmentez-vous cette limite sur instruction ? Les fraudeurs prétendent souvent que votre argent n'est pas sûr.\nC'est une ARNAQUE. Nous ne vous demanderons jamais de déplacer de l'argent.\nVous pourriez tout perdre.",
          },
        ],
      },
    },
  ],
  display: localizedWeroCardDisplay,
} satisfies SdJwtConfiguration & ZScaAttestationExt

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

const coolWeroCardDisplay = {
  text_color: '#1D1C1C',
  background_color: '#fff48d',
  background_image: {
    uri: `${AGENT_HOST}/assets/issuers/wero/much_cool.jpeg`,
  },
} as const

const localizedCoolWeroCardDisplay = [
  {
    locale: 'en',
    name: 'Cool Wero',
    ...coolWeroCardDisplay,
    rendering: {
      simple: coolWeroCardDisplay,
    },
  },
] as [CredentialConfigurationDisplay, ...CredentialConfigurationDisplay[]]

const coolWeroScaConfiguration = {
  format: OpenId4VciCredentialFormatProfile.SdJwtDc,
  vct: `${AGENT_HOST}/api/vct/${issuerId}/${encodeURI('openid4vc:credential:CoolWeroSca')}`,
  scope: 'openid4vc:credential:CoolWeroSca',
  extends: weroScaConfiguration.vct,
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
    display: localizedCoolWeroCardDisplay,
  },
  display: localizedCoolWeroCardDisplay,
} satisfies SdJwtConfiguration

const coolWeroScaData = {
  credentialConfigurationId: coolWeroScaConfiguration.scope,
  format: coolWeroScaConfiguration.format,
  credential: {
    payload: {
      ...weroPayloadClaims,
      iat: dateToSeconds(now),
      nbf: dateToSeconds(now),
      exp: dateToSeconds(expiry),
      vct: coolWeroScaConfiguration.vct,
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
    {
      [OpenId4VciCredentialFormatProfile.SdJwtDc]: {
        configuration: coolWeroScaConfiguration,
        data: coolWeroScaData,
      },
    },
  ],
  display: [
    {
      name: 'Wero (Demo)',
      logo: {
        url: `${AGENT_HOST}/assets/issuers/wero/issuer.svg`,
        uri: `${AGENT_HOST}/assets/issuers/wero/issuer.svg`,
      },
    },
  ],
} satisfies PlaygroundIssuerOptions

export const weroCredentialsData = {
  [weroScaData.credentialConfigurationId]: weroScaData,
  [coolWeroScaData.credentialConfigurationId]: coolWeroScaData,
}
