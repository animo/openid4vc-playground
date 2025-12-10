import { ClaimFormat, Kms, type NonEmptyArray } from '@credo-ts/core'
import { OpenId4VciCredentialFormatProfile } from '@credo-ts/openid4vc'
import type { CredentialConfigurationClaims, CredentialConfigurationDisplay, SdJwtConfiguration } from '../../issuer'
import type { StaticSdJwtSignInput } from '../../types'
import {
  dateToSeconds,
  oneYearInMilliseconds,
  serverStartupTimeInMilliseconds,
  tenDaysInMilliseconds,
} from '../../utils/date'

const issuanceDate = new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds)
const expirationDate = new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds)

const ageSdJwtDisplays = [
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

const ageSdJwtClaims = [
  {
    path: ['age_over_18'],
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
    path: ['age_over_21'],
    display: [
      { locale: 'en', name: 'Age over 21' },
      { locale: 'nl', name: 'Leeftijd boven 21' },
      { locale: 'fi', name: 'Yli 21-vuotias' },
      { locale: 'sv', name: 'Över 21 år' },
      { locale: 'de', name: 'Über 21 Jahre' },
      { locale: 'sq', name: 'Mbi 21 vjeç' },
      { locale: 'pt', name: 'Maior de 21 anos' },
    ],
  },
] satisfies CredentialConfigurationClaims

export const ageSdJwt = {
  format: OpenId4VciCredentialFormatProfile.SdJwtDc,
  cryptographic_binding_methods_supported: ['jwk'],
  credential_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'age-sd-jwt',
  vct: 'urn:openid:interop:age:1',
  display: ageSdJwtDisplays,
  claims: ageSdJwtClaims,
  credential_metadata: {
    display: ageSdJwtDisplays,
    claims: ageSdJwtClaims,
  },
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} satisfies SdJwtConfiguration

export const ageSdJwtData = {
  credentialConfigurationId: 'age-sd-jwt',
  format: ClaimFormat.SdJwtDc,
  credential: {
    payload: {
      vct: ageSdJwt.vct,

      age_over_18: true,
      age_over_21: false,

      nbf: dateToSeconds(issuanceDate),
      exp: dateToSeconds(expirationDate),
    },
    disclosureFrame: {
      _sd: ['age_over_18', 'age_over_21'],
    },
  },
} satisfies StaticSdJwtSignInput
