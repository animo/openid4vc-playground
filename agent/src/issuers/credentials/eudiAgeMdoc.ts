import { ClaimFormat, Kms, type NonEmptyArray } from '@credo-ts/core'
import { OpenId4VciCredentialFormatProfile } from '@credo-ts/openid4vc'
import type { CredentialConfigurationClaims, CredentialConfigurationDisplay, MdocConfiguration } from '../../issuer.js'
import type { StaticMdocSignInput } from '../../types.js'
import { oneYearInMilliseconds, serverStartupTimeInMilliseconds, tenDaysInMilliseconds } from '../../utils/date.js'

const issuanceDate = new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds)
const expirationDate = new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds)

const eudiAgeMdocDisplays = [
  {
    locale: 'en',
    name: 'Age',
    text_color: '#2F3544',
    background_color: '#F1F2F0',
  },
  {
    locale: 'nl',
    name: 'Leeftijd',
    text_color: '#2F3544',
    background_color: '#F1F2F0',
  },
  {
    locale: 'fi',
    name: 'Ikä',
    text_color: '#2F3544',
    background_color: '#F1F2F0',
  },
  {
    locale: 'sv',
    name: 'Ålder',
    text_color: '#2F3544',
    background_color: '#F1F2F0',
  },
  {
    locale: 'de',
    name: 'Alter',
    text_color: '#2F3544',
    background_color: '#F1F2F0',
  },
  {
    locale: 'sq',
    name: 'Mosha',
    text_color: '#2F3544',
    background_color: '#F1F2F0',
  },
  {
    locale: 'pt',
    name: 'Idade',
    text_color: '#2F3544',
    background_color: '#F1F2F0',
  },
] satisfies NonEmptyArray<CredentialConfigurationDisplay>

const eudiAgeMdocClaims = [
  {
    path: ['eu.europa.ec.av.1', 'age_over_18'],
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
] satisfies CredentialConfigurationClaims

export const eudiAgeMdoc = {
  format: OpenId4VciCredentialFormatProfile.MsoMdoc,
  cryptographic_binding_methods_supported: ['cose_key'],
  credential_signing_alg_values_supported: [Kms.KnownCoseSignatureAlgorithms.ESP256],
  scope: 'proof_of_age',
  doctype: 'eu.europa.ec.av.1',
  display: eudiAgeMdocDisplays,
  claims: eudiAgeMdocClaims,
  credential_metadata: {
    display: eudiAgeMdocDisplays,
    claims: eudiAgeMdocClaims,
  },
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} satisfies MdocConfiguration

export const eudiAgeMdocData = {
  credentialConfigurationId: 'proof_of_age',
  format: ClaimFormat.MsoMdoc,
  credential: {
    docType: eudiAgeMdoc.doctype,
    validityInfo: {
      signed: issuanceDate,
      validFrom: issuanceDate,
      validUntil: expirationDate,
    },
    namespaces: {
      [eudiAgeMdoc.doctype]: {
        age_over_18: true,
      },
    },
  },
} satisfies StaticMdocSignInput
