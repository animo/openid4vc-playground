import { ClaimFormat, JwaSignatureAlgorithm } from '@credo-ts/core'
import {
  type OpenId4VciCreateIssuerOptions,
  OpenId4VciCredentialFormatProfile,
  type OpenId4VciCredentialSupportedWithId,
} from '@credo-ts/openid4vc'

import { AGENT_HOST } from '../constants'
import type { CredentialDisplay, StaticMdocSignInput, StaticSdJwtSignInput } from '../types'
import {
  DateOnly,
  dateToSeconds,
  oneYearInMilliseconds,
  serverStartupTimeInMilliseconds,
  tenDaysInMilliseconds,
} from '../utils/date'
import { loadJPEGBufferSync } from '../utils/image'

const erikaPortrait = loadJPEGBufferSync(`${__dirname}/../../assets/erika.jpeg`)

const mobileDriversLicenseDisplay = {
  locale: 'en',
  name: 'Führerschein',
  text_color: '#6F5C77',
  background_color: '#E6E2E7',
  background_image: {
    url: `${AGENT_HOST}/assets/issuers/infrastruktur/credential.png`,
    uri: `${AGENT_HOST}/assets/issuers/infrastruktur/credential.png`,
  },
} satisfies CredentialDisplay

const mobileDriversLicensePayload = {
  given_name: 'Erika',
  family_name: 'Mustermann',
  birth_date: new DateOnly('1964-08-12'),
  document_number: 'Z021AB37X13',
  // FIXME: portrait currently broken for mdoc
  // portrait: erikaPortrait,
  un_distinguishing_sign: 'D',
  issuing_authority: 'Bundesrepublik Deutschland',
  issue_date: new DateOnly(new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds).toISOString()),
  expiry_date: new DateOnly(new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds).toISOString()),
  issuing_country: 'DE',
  driving_priviliges: [
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
  id: 'mobile-drivers-license-mdoc',
  doctype: 'org.iso.18013.5.1.mDL.1',
  display: [mobileDriversLicenseDisplay],
} as const satisfies OpenId4VciCredentialSupportedWithId

export const mobileDriversLicenseMdocData = {
  credentialSupportedId: mobileDriversLicenseMdoc.id,
  format: ClaimFormat.MsoMdoc,
  docType: mobileDriversLicenseMdoc.doctype,
  namespaces: {
    [mobileDriversLicenseMdoc.doctype]: mobileDriversLicensePayload,
  },
  validityInfo: {
    validFrom: mobileDriversLicensePayload.issue_date,
    validUntil: mobileDriversLicensePayload.expiry_date,
  },
} satisfies StaticMdocSignInput

export const mobileDriversLicenseSdJwt = {
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  cryptographic_binding_methods_supported: ['jwk'],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  id: 'mobile-drivers-license-sd-jwt',
  vct: 'https://example.eudi.ec.europa.eu/mdl/1',
  display: [mobileDriversLicenseDisplay],
} as const satisfies OpenId4VciCredentialSupportedWithId

export const mobileDriversLicenseSdJwtData = {
  credentialSupportedId: mobileDriversLicenseSdJwt.id,
  format: ClaimFormat.SdJwtVc,
  payload: {
    ...mobileDriversLicensePayload,
    birth_date: mobileDriversLicensePayload.birth_date.toISOString(),
    nbf: dateToSeconds(mobileDriversLicensePayload.issue_date),
    exp: dateToSeconds(mobileDriversLicensePayload.expiry_date),
    issue_date: mobileDriversLicensePayload.issue_date.toISOString(),
    expiry_date: mobileDriversLicensePayload.expiry_date.toISOString(),
    vct: mobileDriversLicenseSdJwt.vct,
    portrait: `data:image/jpeg;base64,${erikaPortrait.toString('base64')}`,
    driving_priviliges: [
      {
        ...mobileDriversLicensePayload.driving_priviliges[0],
        issue_date: mobileDriversLicensePayload.driving_priviliges[0].issue_date.toISOString(),
        expiry_date: mobileDriversLicensePayload.driving_priviliges[0].expiry_date.toISOString(),
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
      'driving_priviliges',
    ],
    // TODO: fix array disclosures?
    // @ts-ignore
    // driving_priviliges: mobileDriversLicensePayload.driving_priviliges.map((d) => ({
    //   _sd: ['vehicle_category_code', 'issue_date', 'expiry_date', 'codes'],
    // })),
  },
} satisfies StaticSdJwtSignInput

// https://animosolutions.getoutline.com/doc/certificate-of-residence-attestation-KjzG4n9VG0
export const infrastrukturIssuer = {
  issuerId: '188e2459-6da8-4431-9062-2fcdac274f41',
  credentialsSupported: [mobileDriversLicenseSdJwt, mobileDriversLicenseMdoc],
  display: [
    {
      name: 'Bundesministerium fur Verkehr und digitale Infrastruktur',
      logo: {
        url: `${AGENT_HOST}/assets/issuers/infrastruktur/issuer.png`,
        uri: `${AGENT_HOST}/assets/issuers/infrastruktur/issuer.png`,
      },
    },
  ],
} satisfies OpenId4VciCreateIssuerOptions

export const infrastrukturCredentialsData = {
  [mobileDriversLicenseSdJwtData.credentialSupportedId]: mobileDriversLicenseSdJwtData,
  [mobileDriversLicenseMdocData.credentialSupportedId]: mobileDriversLicenseMdocData,
}
