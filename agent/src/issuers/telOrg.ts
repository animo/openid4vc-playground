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

const msisdnDisplay = {
  locale: 'en',
  name: 'MSISDN',
  text_color: '#000000',
  background_color: '#ffb2e1',
  background_image: {
    url: `${AGENT_HOST}/assets/issuers/telOrg/credential.png`,
    uri: `${AGENT_HOST}/assets/issuers/telOrg/credential.png`,
  },
} satisfies CredentialConfigurationDisplay

const msisdnPayload = {
  credential_type: 'MSISDN',
  phone_number: '491511234567',
  registered_family_name: 'Musterman',
  registered_given_name: 'John Michael',
  contract_owner: true,
  end_user: false,
  mobile_operator: 'Telekom_DE',
  issuing_organization: 'TelOrg',
  verification_date: new DateOnly('2023-08-25'),
  verification_method_information: 'NumberVerify',

  issuance_date: new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds),
  expiry_date: new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds),
}

export const msisdnMdoc = {
  format: OpenId4VciCredentialFormatProfile.MsoMdoc,
  cryptographic_binding_methods_supported: ['cose_key'],
  cryptographic_suites_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'msisdn-mdoc',
  doctype: 'eu.europa.ec.eudi.msisdn.1',
  display: [msisdnDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} as const satisfies MdocConfiguration

export const msisdnMdocData = {
  credentialConfigurationId: 'msisdn-mdoc',
  format: ClaimFormat.MsoMdoc,
  credential: {
    docType: msisdnMdoc.doctype,
    namespaces: {
      [msisdnMdoc.doctype]: {
        ...msisdnPayload,
      },
    },
    validityInfo: {
      validFrom: msisdnPayload.issuance_date,
      validUntil: msisdnPayload.expiry_date,

      // Causes issue in google identity credential if not present
      // Update half year before expiry
      expectedUpdate: new Date(serverStartupTimeInMilliseconds + Math.floor(oneYearInMilliseconds / 2)),
      signed: msisdnPayload.issuance_date,
    },
  },
} satisfies StaticMdocSignInput

export const msisdnSdJwt = {
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  cryptographic_binding_methods_supported: ['jwk'],
  cryptographic_suites_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'msisdn-sd-jwt',
  vct: 'eu.europa.ec.eudi.msisdn.1',
  display: [msisdnDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} as const satisfies SdJwtConfiguration

export const msisdnSdJwtData = {
  credentialConfigurationId: 'msisdn-sd-jwt',
  format: ClaimFormat.SdJwtVc,
  credential: {
    payload: {
      ...msisdnPayload,
      nbf: dateToSeconds(msisdnPayload.issuance_date),
      exp: dateToSeconds(msisdnPayload.expiry_date),
      issuance_date: msisdnPayload.issuance_date.toISOString(),
      expiry_date: msisdnPayload.expiry_date.toISOString(),
      vct: msisdnSdJwt.vct,
      verification_date: msisdnPayload.verification_date.toISOString(),
    },
    disclosureFrame: {
      _sd: [
        'phone_number',
        'registered_family_name',
        'registered_given_name',
        'contract_owner',
        'end_user',
        'mobile_operator',
        'issuing_organization',
        'verification_date',
        'verification_method_information',
        'issuance_date',
        'expiry_date',
      ],
    },
  },
} satisfies StaticSdJwtSignInput

// https://animosolutions.getoutline.com/doc/credential-msisdn-1BljW1GEM0
export const telOrgIssuer = {
  tags: [msisdnDisplay.name],
  issuerId: 'a5292f18-3c9f-484a-8515-fb4ec4cb33e8',
  credentialConfigurationsSupported: [
    {
      'vc+sd-jwt': {
        configuration: msisdnSdJwt,
        data: msisdnSdJwtData,
      },
      mso_mdoc: {
        configuration: msisdnMdoc,
        data: msisdnMdocData,
      },
    },
  ],
  batchCredentialIssuance: {
    batchSize: 10,
  },
  display: [
    {
      name: 'TelOrg',
      logo: {
        url: `${AGENT_HOST}/assets/issuers/telOrg/issuer.png`,
        uri: `${AGENT_HOST}/assets/issuers/telOrg/issuer.png`,
      },
    },
  ],
} satisfies PlaygroundIssuerOptions

export const telOrgCredentialsData = {
  [msisdnSdJwtData.credentialConfigurationId]: msisdnSdJwtData,
  [msisdnMdocData.credentialConfigurationId]: msisdnMdocData,
}
