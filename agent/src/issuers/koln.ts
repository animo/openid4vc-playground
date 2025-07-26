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

const certificateOfResidenceDisplay = {
  locale: 'en',
  name: 'Certificate of Residence',
  text_color: '#525C75',
  background_color: '#E4DEDD',
  background_image: {
    url: `${AGENT_HOST}/assets/issuers/koln/credential.png`,
    uri: `${AGENT_HOST}/assets/issuers/koln/credential.png`,
  },
} satisfies CredentialConfigurationDisplay

const certificateOfResidencePayload = {
  family_name: 'Mustermann',
  given_name: 'Erika',
  birth_date: new DateOnly('1964-08-12'),
  resident_address: 'Heidestrasse 17, 51147 Koln',
  gender: 2,
  birth_place: 'Köln',
  arrival_date: new DateOnly('2024-03-01'),
  nationality: 'DE',
  issuance_date: new DateOnly(new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds).toISOString()),
  expiry_date: new DateOnly(new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds).toISOString()),
  issuing_country: 'DE',
}

export const certificateOfResidenceMdoc = {
  format: OpenId4VciCredentialFormatProfile.MsoMdoc,
  cryptographic_binding_methods_supported: ['cose_key'],
  cryptographic_suites_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'certificate-of-residence-mdoc',
  doctype: 'eu.europa.ec.eudi.cor.1',
  display: [certificateOfResidenceDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} as const satisfies MdocConfiguration

export const certificateOfResidenceMdocData = {
  credentialConfigurationId: 'certificate-of-residence-mdoc',
  format: ClaimFormat.MsoMdoc,
  credential: {
    docType: certificateOfResidenceMdoc.doctype,
    namespaces: {
      [certificateOfResidenceMdoc.doctype]: { ...certificateOfResidencePayload },
    },
    validityInfo: {
      validFrom: new Date(certificateOfResidencePayload.issuance_date.toISOString()),
      validUntil: new Date(certificateOfResidencePayload.expiry_date.toISOString()),
    },
  },
} satisfies StaticMdocSignInput

export const certificateOfResidenceSdJwt = {
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  cryptographic_binding_methods_supported: ['jwk'],
  cryptographic_suites_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'certificate-of-residence-sd-jwt',
  vct: 'https://example.eudi.ec.europa.eu/cor/1',
  display: [certificateOfResidenceDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} as const satisfies SdJwtConfiguration

export const certificateOfResidenceSdJwtData = {
  credentialConfigurationId: 'certificate-of-residence-sd-jwt',
  format: ClaimFormat.SdJwtVc,
  credential: {
    payload: {
      ...certificateOfResidencePayload,
      birth_date: certificateOfResidencePayload.birth_date.toISOString(),
      arrival_date: certificateOfResidencePayload.arrival_date.toISOString(),
      nbf: dateToSeconds(certificateOfResidencePayload.issuance_date),
      exp: dateToSeconds(certificateOfResidencePayload.expiry_date),
      issuance_date: certificateOfResidencePayload.issuance_date.toISOString(),
      expiry_date: certificateOfResidencePayload.expiry_date.toISOString(),
      vct: certificateOfResidenceSdJwt.vct,
    },
    disclosureFrame: {
      _sd: [
        'family_name',
        'given_name',
        'resident_address',
        'birth_date',
        'gender',
        'birth_place',
        'arrival_date',
        'nationality',
      ],
    },
  },
} satisfies StaticSdJwtSignInput

// https://animosolutions.getoutline.com/doc/certificate-of-residence-attestation-KjzG4n9VG0
export const kolnIssuer = {
  tags: [certificateOfResidenceDisplay.name],
  issuerId: '832f1c72-817d-4a54-b0fc-9994ecaba291',
  credentialConfigurationsSupported: [
    {
      'vc+sd-jwt': {
        configuration: certificateOfResidenceSdJwt,
        data: certificateOfResidenceSdJwtData,
      },
      mso_mdoc: {
        configuration: certificateOfResidenceMdoc,
        data: certificateOfResidenceMdocData,
      },
    },
  ],
  batchCredentialIssuance: {
    batchSize: 10,
  },
  display: [
    {
      name: 'Bürgeramt Köln',
      logo: {
        url: `${AGENT_HOST}/assets/issuers/koln/issuer.png`,
        uri: `${AGENT_HOST}/assets/issuers/koln/issuer.png`,
      },
    },
  ],
} satisfies PlaygroundIssuerOptions

export const kolnCredentialsData = {
  [certificateOfResidenceSdJwtData.credentialConfigurationId]: certificateOfResidenceSdJwtData,
  [certificateOfResidenceMdocData.credentialConfigurationId]: certificateOfResidenceMdocData,
}
