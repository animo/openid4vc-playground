import { ClaimFormat, DateOnly, Kms, type NonEmptyArray } from '@credo-ts/core'
import { OpenId4VciCredentialFormatProfile } from '@credo-ts/openid4vc'
import { AGENT_HOST } from '../../constants'
import type { CredentialConfigurationClaims, CredentialConfigurationDisplay, MdocConfiguration } from '../../issuer'
import type { StaticMdocSignInput } from '../../types'
import { oneYearInMilliseconds, serverStartupTimeInMilliseconds, tenDaysInMilliseconds } from '../../utils/date'
import { loadJPEGBufferSync } from '../../utils/image'

const erikaPortrait = loadJPEGBufferSync(`${__dirname}/../../../assets/erika.jpeg`)
const erikaSignature = loadJPEGBufferSync(`${__dirname}/../../../assets/signature.jpeg`)

const mobileDriversLicenseDisplays = [
  {
    locale: 'en',
    name: 'Driving Licence',
    text_color: '#6F5C77',
    background_color: '#E6E2E7',
    background_image: {
      url: `${AGENT_HOST}/assets/issuers/bdr/credential.png`,
      uri: `${AGENT_HOST}/assets/issuers/bdr/credential.png`,
    },
  },
  {
    locale: 'nl',
    name: 'Rijbewijs',
    text_color: '#6F5C77',
    background_color: '#E6E2E7',
    background_image: {
      url: `${AGENT_HOST}/assets/issuers/bdr/credential.png`,
      uri: `${AGENT_HOST}/assets/issuers/bdr/credential.png`,
    },
  },
  {
    locale: 'fi',
    name: 'Ajokortti',
    text_color: '#6F5C77',
    background_color: '#E6E2E7',
    background_image: {
      url: `${AGENT_HOST}/assets/issuers/bdr/credential.png`,
      uri: `${AGENT_HOST}/assets/issuers/bdr/credential.png`,
    },
  },
  {
    locale: 'sv',
    name: 'Körkort',
    text_color: '#6F5C77',
    background_color: '#E6E2E7',
    background_image: {
      url: `${AGENT_HOST}/assets/issuers/bdr/credential.png`,
      uri: `${AGENT_HOST}/assets/issuers/bdr/credential.png`,
    },
  },
  {
    locale: 'de',
    name: 'Führerschein',
    text_color: '#6F5C77',
    background_color: '#E6E2E7',
    background_image: {
      url: `${AGENT_HOST}/assets/issuers/bdr/credential.png`,
      uri: `${AGENT_HOST}/assets/issuers/bdr/credential.png`,
    },
  },
  {
    locale: 'sq',
    name: 'Patentë shoferi',
    text_color: '#6F5C77',
    background_color: '#E6E2E7',
    background_image: {
      url: `${AGENT_HOST}/assets/issuers/bdr/credential.png`,
      uri: `${AGENT_HOST}/assets/issuers/bdr/credential.png`,
    },
  },
  {
    locale: 'pt',
    name: 'Carta de condução',
    text_color: '#6F5C77',
    background_color: '#E6E2E7',
    background_image: {
      url: `${AGENT_HOST}/assets/issuers/bdr/credential.png`,
      uri: `${AGENT_HOST}/assets/issuers/bdr/credential.png`,
    },
  },
] satisfies NonEmptyArray<CredentialConfigurationDisplay>

const mobileDriversLicenseClaims = [
  {
    path: ['org.iso.18013.5.1', 'given_name'],
    display: [
      { locale: 'en', name: 'Given name' },
      { locale: 'nl', name: 'Voornaam' },
      { locale: 'fi', name: 'Etunimi' },
      { locale: 'sv', name: 'Förnamn' },
      { locale: 'de', name: 'Vorname' },
      { locale: 'sq', name: 'Emri' },
      { locale: 'pt', name: 'Nome próprio' },
    ],
  },
  {
    path: ['org.iso.18013.5.1', 'family_name'],
    display: [
      { locale: 'en', name: 'Family name' },
      { locale: 'nl', name: 'Achternaam' },
      { locale: 'fi', name: 'Sukunimi' },
      { locale: 'sv', name: 'Efternamn' },
      { locale: 'de', name: 'Nachname' },
      { locale: 'sq', name: 'Mbiemri' },
      { locale: 'pt', name: 'Sobrenome' },
    ],
  },
  {
    path: ['org.iso.18013.5.1', 'birth_date'],
    display: [
      { locale: 'en', name: 'Birth date' },
      { locale: 'nl', name: 'Geboortedatum' },
      { locale: 'fi', name: 'Syntymäaika' },
      { locale: 'sv', name: 'Födelsedatum' },
      { locale: 'de', name: 'Geburtsdatum' },
      { locale: 'sq', name: 'Data e lindjes' },
      { locale: 'pt', name: 'Data de nascimento' },
    ],
  },
  {
    path: ['org.iso.18013.5.1', 'age_over_18'],
    display: [
      { locale: 'en', name: 'Age over 18' },
      { locale: 'nl', name: 'Leeftijd boven 18' },
      { locale: 'fi', name: 'Yli 18-vuotias' },
      { locale: 'sv', name: 'Över 18 år' },
      { locale: 'de', name: 'Über 18 Jahre' },
      { locale: 'sq', name: 'Mbi 18 vjeç' },
      { locale: 'pt', name: 'Maior de 18 anos' },
    ],
  },
  {
    path: ['org.iso.18013.5.1', 'document_number'],
    display: [
      { locale: 'en', name: 'Document number' },
      { locale: 'nl', name: 'Documentnummer' },
      { locale: 'fi', name: 'Asiakirjan numero' },
      { locale: 'sv', name: 'Dokumentnummer' },
      { locale: 'de', name: 'Dokumentennummer' },
      { locale: 'sq', name: 'Numri i dokumentit' },
      { locale: 'pt', name: 'Número do documento' },
    ],
  },
  {
    path: ['org.iso.18013.5.1', 'issue_date'],
    display: [
      { locale: 'en', name: 'Issue date' },
      { locale: 'nl', name: 'Afgiftedatum' },
      { locale: 'fi', name: 'Myöntämispäivä' },
      { locale: 'sv', name: 'Utfärdandedatum' },
      { locale: 'de', name: 'Ausstellungsdatum' },
      { locale: 'sq', name: 'Data e lëshimit' },
      { locale: 'pt', name: 'Data de emissão' },
    ],
  },
  {
    path: ['org.iso.18013.5.1', 'expiry_date'],
    display: [
      { locale: 'en', name: 'Expiry date' },
      { locale: 'nl', name: 'Vervaldatum' },
      { locale: 'fi', name: 'Viimeinen voimassaolopäivä' },
      { locale: 'sv', name: 'Utgångsdatum' },
      { locale: 'de', name: 'Ablaufdatum' },
      { locale: 'sq', name: 'Data e skadimit' },
      { locale: 'pt', name: 'Data de validade' },
    ],
  },
  {
    path: ['org.iso.18013.5.1', 'issuing_country'],
    display: [
      { locale: 'en', name: 'Issuing country' },
      { locale: 'nl', name: 'Land van afgifte' },
      { locale: 'fi', name: 'Myöntäjämaa' },
      { locale: 'sv', name: 'Utfärdande land' },
      { locale: 'de', name: 'Ausstellungsland' },
      { locale: 'sq', name: 'Shteti lëshues' },
      { locale: 'pt', name: 'País emissor' },
    ],
  },
  {
    path: ['org.iso.18013.5.1', 'issuing_authority'],
    display: [
      { locale: 'en', name: 'Issuing authority' },
      { locale: 'nl', name: 'Uitgevende instantie' },
      { locale: 'fi', name: 'Myöntäjäviranomainen' },
      { locale: 'sv', name: 'Utfärdande myndighet' },
      { locale: 'de', name: 'Ausstellende Behörde' },
      { locale: 'sq', name: 'Autoriteti lëshues' },
      { locale: 'pt', name: 'Autoridade emissora' },
    ],
  },
  {
    path: ['org.iso.18013.5.1', 'resident_postal_code'],
    display: [
      { locale: 'en', name: 'Postal code' },
      { locale: 'nl', name: 'Postcode' },
      { locale: 'fi', name: 'Postinumero' },
      { locale: 'sv', name: 'Postnummer' },
      { locale: 'de', name: 'Postleitzahl' },
      { locale: 'sq', name: 'Kodi postar' },
      { locale: 'pt', name: 'Código postal' },
    ],
  },
  {
    path: ['org.iso.18013.5.1', 'driving_privileges'],
    display: [
      { locale: 'en', name: 'Driving privileges' },
      { locale: 'nl', name: 'Rijbevoegdheden' },
      { locale: 'fi', name: 'Ajo-oikeudet' },
      { locale: 'sv', name: 'Körbehörigheter' },
      { locale: 'de', name: 'Fahrberechtigungen' },
      { locale: 'sq', name: 'Privilegjet e drejtimit' },
      { locale: 'pt', name: 'Privilégios de condução' },
    ],
  },
  {
    path: ['org.iso.18013.5.1', 'driving_privileges', null, 'vehicle_category_code'],
    display: [
      { locale: 'en', name: 'Vehicle category' },
      { locale: 'nl', name: 'Voertuigcategorie' },
      { locale: 'fi', name: 'Ajoneuvoluokka' },
      { locale: 'sv', name: 'Fordonskategori' },
      { locale: 'de', name: 'Fahrzeugklasse' },
      { locale: 'sq', name: 'Kategoria e automjetit' },
      { locale: 'pt', name: 'Categoria de veículo' },
    ],
  },
  {
    path: ['org.iso.18013.5.1', 'driving_privileges', null, 'issue_date'],
    display: [
      { locale: 'en', name: 'Issue date' },
      { locale: 'nl', name: 'Afgiftedatum' },
      { locale: 'fi', name: 'Myöntämispäivä' },
      { locale: 'sv', name: 'Utfärdandedatum' },
      { locale: 'de', name: 'Ausstellungsdatum' },
      { locale: 'sq', name: 'Data e lëshimit' },
      { locale: 'pt', name: 'Data de emissão' },
    ],
  },
  {
    path: ['org.iso.18013.5.1', 'driving_privileges', null, 'expiry_date'],
    display: [
      { locale: 'en', name: 'Expiry date' },
      { locale: 'nl', name: 'Vervaldatum' },
      { locale: 'fi', name: 'Viimeinen voimassaolopäivä' },
      { locale: 'sv', name: 'Utgångsdatum' },
      { locale: 'de', name: 'Ablaufdatum' },
      { locale: 'sq', name: 'Data e skadimit' },
      { locale: 'pt', name: 'Data de validade' },
    ],
  },
  {
    path: ['org.iso.18013.5.1', 'driving_privileges', null, 'codes'],
    display: [
      { locale: 'en', name: 'Restriction codes' },
      { locale: 'nl', name: 'Beperkingscodes' },
      { locale: 'fi', name: 'Rajoituskoodit' },
      { locale: 'sv', name: 'Restriktionskoder' },
      { locale: 'de', name: 'Beschränkungscodes' },
      { locale: 'sq', name: 'Kodet e kufizimit' },
      { locale: 'pt', name: 'Códigos de restrição' },
    ],
  },
  {
    path: ['org.iso.18013.5.1', 'driving_privileges', null, 'codes', null, 'code'],
    display: [
      { locale: 'en', name: 'Code' },
      { locale: 'nl', name: 'Code' },
      { locale: 'fi', name: 'Koodi' },
      { locale: 'sv', name: 'Kod' },
      { locale: 'de', name: 'Code' },
      { locale: 'sq', name: 'Kodi' },
      { locale: 'pt', name: 'Código' },
    ],
  },
  {
    path: ['org.iso.18013.5.1', 'driving_privileges', null, 'codes', null, 'value'],
    display: [
      { locale: 'en', name: 'Value' },
      { locale: 'nl', name: 'Waarde' },
      { locale: 'fi', name: 'Arvo' },
      { locale: 'sv', name: 'Värde' },
      { locale: 'de', name: 'Wert' },
      { locale: 'sq', name: 'Vlera' },
      { locale: 'pt', name: 'Valor' },
    ],
  },
  {
    path: ['org.iso.18013.5.1', 'driving_privileges', null, 'codes', null, 'sign'],
    display: [
      { locale: 'en', name: 'Sign' },
      { locale: 'nl', name: 'Teken' },
      { locale: 'fi', name: 'Merkki' },
      { locale: 'sv', name: 'Tecken' },
      { locale: 'de', name: 'Zeichen' },
      { locale: 'sq', name: 'Shenja' },
      { locale: 'pt', name: 'Sinal' },
    ],
  },
] satisfies CredentialConfigurationClaims

const mobileDriversLicensePayload = {
  given_name: 'Erika',
  family_name: 'Mustermann',
  birth_date: new DateOnly('1964-08-12'),
  age_over_18: true,
  document_number: 'Z021AB37X13',
  portrait: new Uint8Array(erikaPortrait),
  signature_usual_mark: new Uint8Array(erikaSignature),
  resident_postal_code: '90210',
  un_distinguishing_sign: 'D',
  issuing_authority: 'Bundesrepublik Deutschland',
  issue_date: new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds),
  expiry_date: new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds),
  // Must be same as C= in x509 cert (currently set to NL)
  issuing_country: 'NL',
  driving_privileges: [
    {
      vehicle_category_code: 'B',
      issue_date: new DateOnly('2024-01-15'),
      expiry_date: new DateOnly('2039-01-14'),
      codes: [
        {
          code: 'B96',
          value: '4250',
          sign: '≤',
        },
        {
          code: '70',
          value: '01.01',
        },
        {
          code: '95',
          value: '2029-01-15',
        },
        {
          code: '96',
          value: '750',
          sign: '≤',
        },
      ],
    },
  ],
}

export const mobileDriversLicenseMdoc = {
  format: OpenId4VciCredentialFormatProfile.MsoMdoc,
  cryptographic_binding_methods_supported: ['cose_key'],
  credential_signing_alg_values_supported: [Kms.KnownCoseSignatureAlgorithms.ESP256],
  scope: 'mdl-mdoc',
  doctype: 'org.iso.18013.5.1.mDL',
  display: mobileDriversLicenseDisplays,
  claims: mobileDriversLicenseClaims,
  credential_metadata: {
    display: mobileDriversLicenseDisplays,
    claims: mobileDriversLicenseClaims,
  },
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} as const satisfies MdocConfiguration

export const mobileDriversLicenseMdocData = {
  credentialConfigurationId: 'mdl-mdoc',
  format: ClaimFormat.MsoMdoc,
  credential: {
    docType: mobileDriversLicenseMdoc.doctype,
    namespaces: {
      'org.iso.18013.5.1': mobileDriversLicensePayload,
    },
    validityInfo: {
      validFrom: mobileDriversLicensePayload.issue_date,
      validUntil: mobileDriversLicensePayload.expiry_date,

      // Causes issue in google identity credential if not present
      // Update half year before expiry
      expectedUpdate: new Date(serverStartupTimeInMilliseconds + Math.floor(oneYearInMilliseconds / 2)),
      signed: mobileDriversLicensePayload.issue_date,
    },
  },
} satisfies StaticMdocSignInput
