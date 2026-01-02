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
import { loadJPEGBufferSync } from '../utils/image'

const erikaPortrait = loadJPEGBufferSync(`${__dirname}/../../assets/erika.jpeg`)
const erikaSignature = loadJPEGBufferSync(`${__dirname}/../../assets/signature.jpeg`)

const mobileDriversLicenseDisplay = {
  locale: 'en',
  name: 'Drivers Licence',
  text_color: '#6F5C77',
  background_color: '#E6E2E7',
  background_image: {
    url: `${AGENT_HOST}/assets/issuers/bdr/credential.png`,
    uri: `${AGENT_HOST}/assets/issuers/bdr/credential.png`,
  },
} satisfies CredentialConfigurationDisplay

const mobileDriversLicensePayload = {
  given_name: 'Erika',
  family_name: 'Mustermann',
  birth_date: new DateOnly('1964-08-12'),
  age_over_18: true,
  document_number: 'Z021AB37X13',
  portrait: new Uint8Array(erikaPortrait),
  signature_usual_mark: new Uint8Array(erikaSignature),
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
  scope: 'mobile-drivers-license-mdoc',
  doctype: 'org.iso.18013.5.1.mDL',
  display: [mobileDriversLicenseDisplay],
  credential_metadata: {
    display: [mobileDriversLicenseDisplay],
  },
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} as const satisfies MdocConfiguration

export const mobileDriversLicenseMdocData = {
  credentialConfigurationId: 'mobile-drivers-license-mdoc',
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

const arfCompliantPidDisplay = {
  locale: 'en',
  name: 'PID (ARF)',
  text_color: '#2F3544',
  background_color: '#F1F2F0',
  background_image: {
    url: `${AGENT_HOST}/assets/issuers/bdr/pid-credential.png`,
    uri: `${AGENT_HOST}/assets/issuers/bdr/pid-credential.png`,
  },
} satisfies CredentialConfigurationDisplay

export const arfCompliantPidSdJwt = {
  format: OpenId4VciCredentialFormatProfile.SdJwtDc,
  cryptographic_binding_methods_supported: ['jwk'],
  credential_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'arf-pid-sd-jwt',
  vct: 'urn:eudi:pid:1',
  display: [arfCompliantPidDisplay],
  credential_metadata: { display: [arfCompliantPidDisplay] },
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} satisfies SdJwtConfiguration

const arfCompliantPidData = {
  // Mandatory
  family_name: 'Mustermann',
  given_name: 'Erika',
  birth_date: new DateOnly('1964-08-12'),
  age_over_18: true,
  nationality: 'DE',

  // Mandatory metadata
  issuance_date: new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds),
  expiry_date: new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds),
  issuing_country: 'DE',
  issuing_authority: 'DE',

  // Optional:
  age_over_12: true,
  age_over_14: true,
  age_over_16: true,
  age_over_21: true,
  age_over_65: false,
  age_in_years: 40,
  age_birth_year: 1984,
  family_name_birth: 'GABLER',
  birth_place: 'BERLIN',
  resident_country: 'DE',
  resident_city: 'KÖLN',
  resident_postal_code: '51147',
  resident_street: 'HEIDESTRASSE',

  // UC3 stuff
  resident_address: 'HEIDESTRASSE 17, 51147, KÖLN',
  resident_state: 'NORTH RHINE-WESTPHALIA',
  resident_house_number: '17',
  personal_administrative_number: '123123123123',
  portrait: `data:image/jpeg;base64,${erikaPortrait.toString('base64')}`,
  given_name_birth: 'Erika',
  sex: 'female',
  email_address: 'erika@mustermann.de',
  mobile_phone_number: '+49 (0)30 901820',
  document_number: '1119999',
  issuing_jurisdiction: 'DE',
  location_status: 'GOOD',
}

export const arfCompliantPidSdJwtData = {
  credentialConfigurationId: 'arf-pid-sd-jwt',
  format: ClaimFormat.SdJwtDc,
  credential: {
    payload: {
      ...arfCompliantPidData,
      vct: arfCompliantPidSdJwt.vct,

      issuance_date: arfCompliantPidData.issuance_date.toISOString(),
      expiry_date: arfCompliantPidData.expiry_date.toISOString(),

      nbf: dateToSeconds(arfCompliantPidData.issuance_date),
      exp: dateToSeconds(arfCompliantPidData.expiry_date),
    },
    disclosureFrame: {
      _sd: [
        // Mandatory
        'family_name',
        'given_name',
        'birth_date',
        'age_over_18',

        // Mandatory metadata
        'issuance_date',
        'expiry_date',
        'issuing_country',
        'issuing_authority',

        // Optional
        'age_over_12',
        'age_over_14',
        'age_over_16',
        'age_over_21',
        'age_over_65',
        'age_in_years',
        'age_birth_year',
        'family_name_birth',
        'birth_place',
        'resident_country',
        'resident_city',
        'resident_postal_code',
        'resident_street',
        'nationality',
      ],
    },
  },
} satisfies StaticSdJwtSignInput

// https://animosolutions.getoutline.com/doc/certificate-of-residence-attestation-KjzG4n9VG0
export const bdrIssuer = {
  tags: [mobileDriversLicenseDisplay.name, 'ARF 1.5 PID (SD-JWT VC)'],
  issuerId: '188e2459-6da8-4431-9062-2fcdac274f41',
  credentialConfigurationsSupported: [
    {
      mso_mdoc: {
        configuration: mobileDriversLicenseMdoc,
        data: mobileDriversLicenseMdocData,
      },
    },
    {
      'dc+sd-jwt': {
        configuration: arfCompliantPidSdJwt,
        data: arfCompliantPidSdJwtData,
      },
    },
  ] as const,
  batchCredentialIssuance: {
    batchSize: 10,
  },
  display: [
    {
      name: 'Bundesdruckerei',
      logo: {
        url: `${AGENT_HOST}/assets/issuers/bdr/issuer.png`,
        uri: `${AGENT_HOST}/assets/issuers/bdr/issuer.png`,
      },
    },
  ],
} satisfies PlaygroundIssuerOptions

export const bdrCredentialsData = {
  [mobileDriversLicenseMdocData.credentialConfigurationId]: mobileDriversLicenseMdocData,
  [arfCompliantPidSdJwtData.credentialConfigurationId]: arfCompliantPidSdJwtData,
}
