import { ClaimFormat, JwaSignatureAlgorithm, W3cCredential } from '@credo-ts/core'
import { OpenId4VciCredentialFormatProfile } from '@credo-ts/openid4vc'

import { AGENT_HOST } from '../constants'
import type {
  CredentialConfigurationDisplay,
  LdpVcConfiguration,
  MdocConfiguration,
  PlaygroundIssuerOptions,
  SdJwtConfiguration,
} from '../issuer'
import type { StaticLdpVcSignInput, StaticMdocSignInput, StaticSdJwtSignInput } from '../types'
import {
  DateOnly,
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
  cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  scope: 'mobile-drivers-license-mdoc',
  doctype: 'org.iso.18013.5.1.mDL',
  display: [mobileDriversLicenseDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [JwaSignatureAlgorithm.ES256],
    },
  },
} as const satisfies MdocConfiguration

export const mobileDriversLicenseLdpVc = {
  format: OpenId4VciCredentialFormatProfile.LdpVc,
  cryptographic_binding_methods_supported: ['did:jwk'],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  scope: 'mobile-drivers-license-ldp-vc',
  credential_definition: {
    '@context': ['https://www.w3.org/2018/credentials/v1', 'https://w3id.org/vdl/v2'],
    type: ['VerifiableCredential', 'Iso18013DriversLicenseCredential'],
  },
  display: [mobileDriversLicenseDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [JwaSignatureAlgorithm.EdDSA, 'Ed25519Signature2020'],
    },
  },
} as const satisfies LdpVcConfiguration

export const mobileDriversLicenseLdpVcData = {
  credentialConfigurationId: 'mobile-drivers-license-ldp-vc',
  format: ClaimFormat.LdpVc,
  credential: {
    credential: W3cCredential.fromJson({
      '@context': ['https://www.w3.org/2018/credentials/v1', 'https://w3id.org/vdl/v2'],
      type: ['VerifiableCredential', 'Iso18013DriversLicenseCredential'],
      issuer: {
        id: 'did:key:z6MkjxvA4FNrQUhr8f7xhdQuP1VPzErkcnfxsRaU5oFgy2E5',
        name: 'Bundesdruckerei',
        image: `${AGENT_HOST}/assets/issuers/bdr/issuer.png`,
      },
      issuanceDate: '2023-11-15T10:00:00-07:00',
      expirationDate: '2028-11-15T12:00:00-06:00',
      name: "Utopia Driver's License",
      image: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUg...kSuQmCC',
      description: 'A license granting driving privileges in Utopia.',
      credentialSubject: {
        id: 'did:example:12347abcd',
        type: 'LicensedDriver',
        driversLicense: {
          type: 'Iso18013DriversLicense',
          document_number: '542426814',
          family_name: 'TURNER',
          given_name: 'SUSAN',
          portrait: 'data:image/jpeg;base64,/9j/4AAQSkZJR...RSClooooP/2Q==',
          birth_date: '1998-08-28',
          issue_date: '2023-01-15T10:00:00-07:00',
          expiry_date: '2028-08-27T12:00:00-06:00',
          issuing_country: 'NL',
          issuing_authority: 'NL',
          driving_privileges: [
            {
              codes: [{ code: 'D' }],
              vehicle_category_code: 'D',
              issue_date: '2019-01-01',
              expiry_date: '2027-01-01',
            },
            {
              codes: [{ code: 'C' }],
              vehicle_category_code: 'C',
              issue_date: '2019-01-01',
              expiry_date: '2017-01-01',
            },
          ],
          un_distinguishing_sign: 'UTA',
          sex: 2,
        },
      },
    }),
  },
} satisfies StaticLdpVcSignInput

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

export const mobileDriversLicenseSdJwt = {
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  cryptographic_binding_methods_supported: ['jwk'],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  scope: 'mobile-drivers-license-sd-jwt',
  vct: 'https://example.eudi.ec.europa.eu/mdl/1',
  display: [mobileDriversLicenseDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [JwaSignatureAlgorithm.ES256],
    },
  },
} as const satisfies SdJwtConfiguration

export const mobileDriversLicenseSdJwtData = {
  credentialConfigurationId: 'mobile-drivers-license-sd-jwt',
  format: ClaimFormat.SdJwtVc,
  credential: {
    payload: {
      ...mobileDriversLicensePayload,
      birth_date: mobileDriversLicensePayload.birth_date.toISOString(),
      nbf: dateToSeconds(mobileDriversLicensePayload.issue_date),
      exp: dateToSeconds(mobileDriversLicensePayload.expiry_date),
      issue_date: mobileDriversLicensePayload.issue_date.toISOString(),
      expiry_date: mobileDriversLicensePayload.expiry_date.toISOString(),
      vct: mobileDriversLicenseSdJwt.vct,
      portrait: `data:image/jpeg;base64,${erikaPortrait.toString('base64')}`,
      signature_usual_mark: `data:image/jpeg;base64,${erikaSignature.toString('base64')}`,
      driving_privileges: [
        {
          ...mobileDriversLicensePayload.driving_privileges[0],
          issue_date: mobileDriversLicensePayload.driving_privileges[0].issue_date.toISOString(),
          expiry_date: mobileDriversLicensePayload.driving_privileges[0].expiry_date.toISOString(),
        },
      ],
    },
    disclosureFrame: {
      _sd: [
        'given_name',
        'family_name',
        'birth_date',
        'document_number',
        'portrait',
        'un_distinguishing_sign',
        'issuing_authority',
        'issue_date',
        'expiry_date',
        'issuing_country',
        'driving_privileges',
        'signature_usual_mark',
        'age_over_18',
      ],
      // TODO: fix array disclosures?
      // @ts-ignore
      // driving_privileges: mobileDriversLicensePayload.driving_privileges.map((d) => ({
      //   _sd: ['vehicle_category_code', 'issue_date', 'expiry_date', 'codes'],
      // })),
    },
  },
} satisfies StaticSdJwtSignInput

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

const arfCompliantPidUrnVctDisplay = {
  locale: 'en',
  name: 'PID (ARF, urn: vct)',
  text_color: '#2F3544',
  background_color: '#F1F2F0',
  background_image: {
    url: `${AGENT_HOST}/assets/issuers/bdr/pid-credential.png`,
    uri: `${AGENT_HOST}/assets/issuers/bdr/pid-credential.png`,
  },
} satisfies CredentialConfigurationDisplay

export const arfCompliantPidSdJwt = {
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  cryptographic_binding_methods_supported: ['jwk'],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  scope: 'arf-pid-sd-jwt',
  vct: 'eu.europa.ec.eudi.pid.1',
  display: [arfCompliantPidDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [JwaSignatureAlgorithm.ES256],
    },
  },
} satisfies SdJwtConfiguration

export const arfCompliantPidUrnVctSdJwt = {
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  cryptographic_binding_methods_supported: ['jwk'],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  scope: 'arf-pid-sd-jwt-urn-vct',
  vct: 'urn:eu.europa.ec.eudi:pid:1',
  display: [arfCompliantPidUrnVctDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [JwaSignatureAlgorithm.ES256],
    },
  },
} satisfies SdJwtConfiguration

const arfCompliantPidData = {
  // Mandatory
  family_name: 'Mustermann',
  given_name: 'Erika',
  birth_date: new DateOnly('1964-08-12'),
  age_over_18: true,

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
  birth_city: 'BERLIN',
  resident_country: 'DE',
  resident_city: 'KÖLN',
  resident_postal_code: '51147',
  resident_street: 'HEIDESTRASSE 17',
  nationality: 'DE',
}

export const arfCompliantPidSdJwtData = {
  credentialConfigurationId: 'arf-pid-sd-jwt',
  format: ClaimFormat.SdJwtVc,
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
        'birth_city',
        'resident_country',
        'resident_city',
        'resident_postal_code',
        'resident_street',
        'nationality',
      ],
    },
  },
} satisfies StaticSdJwtSignInput

export const arfCompliantPidUrnVctSdJwtData = {
  ...arfCompliantPidSdJwtData,
  credentialConfigurationId: 'arf-pid-sd-jwt-urn-vct',
  credential: {
    ...arfCompliantPidSdJwtData.credential,
    payload: {
      ...arfCompliantPidSdJwtData.credential.payload,
      vct: arfCompliantPidUrnVctSdJwt.vct,
    },
  },
} satisfies StaticSdJwtSignInput

// https://animosolutions.getoutline.com/doc/certificate-of-residence-attestation-KjzG4n9VG0
export const bdrIssuer = {
  tags: [mobileDriversLicenseDisplay.name, arfCompliantPidDisplay.name],
  issuerId: '188e2459-6da8-4431-9062-2fcdac274f41',
  credentialConfigurationsSupported: [
    {
      'vc+sd-jwt': {
        configuration: mobileDriversLicenseSdJwt,
        data: mobileDriversLicenseSdJwtData,
      },
      mso_mdoc: {
        configuration: mobileDriversLicenseMdoc,
        data: mobileDriversLicenseMdocData,
      },
      ldp_vc: {
        configuration: mobileDriversLicenseLdpVc,
        data: mobileDriversLicenseLdpVcData,
      },
    },
    {
      'vc+sd-jwt': {
        configuration: arfCompliantPidSdJwt,
        data: arfCompliantPidSdJwtData,
      },
    },
    {
      'vc+sd-jwt': {
        configuration: arfCompliantPidUrnVctSdJwt,
        data: arfCompliantPidUrnVctSdJwtData,
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
  [mobileDriversLicenseSdJwtData.credentialConfigurationId]: mobileDriversLicenseSdJwtData,
  [mobileDriversLicenseMdocData.credentialConfigurationId]: mobileDriversLicenseMdocData,
  [mobileDriversLicenseLdpVcData.credentialConfigurationId]: mobileDriversLicenseLdpVcData,
  [arfCompliantPidSdJwtData.credentialConfigurationId]: arfCompliantPidSdJwtData,
  [arfCompliantPidUrnVctSdJwtData.credentialConfigurationId]: arfCompliantPidUrnVctSdJwtData,
}
