import { ClaimFormat, DateOnly, Kms } from '@credo-ts/core'
import { OpenId4VciCredentialFormatProfile } from '@credo-ts/openid4vc'

import { AGENT_HOST } from '../constants'
import type { CredentialConfigurationDisplay, MdocConfiguration, PlaygroundIssuerOptions } from '../issuer'
import type { StaticMdocSignInput } from '../types'
import { oneYearInMilliseconds, serverStartupTimeInMilliseconds, tenDaysInMilliseconds } from '../utils/date'

import { age18mDLMdoc, age18mDLMdocData } from './credentials/age18mDLMdoc'
import { over70mDLMdoc, over70mDLMdocData } from './credentials/over70mDLMdoc'

const eHealthDisplay = {
  locale: 'en',
  name: 'Vaccination certificate',
  text_color: '#525C75',
  background_color: '#FFCE00',
  background_image: {
    url: '',
    uri: '',
  },
} satisfies CredentialConfigurationDisplay

const eHealthPayload = {
  fn: 'Mustermann',
  gn: 'Erika',
  dob: new DateOnly('1964-08-12'),
  sex: 2,
  v_RA01_1: {
    tg: '840539006',
    vp: '1119349007',
    mp: 'EU/1/20/1528',
    ma: 'ORG-100030215',
    bn: 'B12345/67',
    dn: 1,
    sd: 2,
    dt: new DateOnly('2021-04-08'),
    co: 'UT',
    ao: 'RHI',
    nx: new DateOnly('2021-05-20'),
    is: 'SC17',
    ci: 'URN:UVCI:01:UT:187/37512422923',
  },
  v_RA01_2: {
    tg: '840539006',
    vp: '1119349007',
    mp: 'EU/1/20/1528',
    ma: 'ORG-100030215',
    bn: 'B67890/12',
    dn: 2,
    sd: 2,
    dt: new DateOnly('2021-05-18'),
    co: 'UT',
    ao: 'RHI',
    is: 'SC17',
    ci: 'URN:UVCI:01:UT:187/37512533044',
  },
  pid_PPN: {
    pty: 'PPN',
    pnr: '476284728',
    pic: 'UT',
  },
  pid_DL: {
    pty: 'DL',
    pnr: '987654321',
    pic: 'UT',
  },

  issuance_date: new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds),
  expiry_date: new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds),
}

const eHealthPayload_2 = {
  '1D47_vaccinated': true,
  RA01_vaccinated: true,
  RA01_test: {
    Result: '260415000',
    TypeOfTest: 'LP6464-4',
    TimeOfTest: new Date('2021-10-12T19:00:00Z'),
  },
  safeEntry_Leisure: {
    SeCondFulfilled: true,
    SeCondType: 'leisure',
    SeCondExpiry: new Date('2021-10-13T19:00:00Z'),
  },
  fac: '',
  fni: 'M',
  gni: 'E',
  by: '1964',
  bm: '08',
  bd: '12',
}

export const eHealthMdoc = {
  format: OpenId4VciCredentialFormatProfile.MsoMdoc,
  cryptographic_binding_methods_supported: ['cose_key'],
  cryptographic_suites_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'e-health-mdoc',
  doctype: 'org.micov.vtr.1.',
  display: [eHealthDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} as const satisfies MdocConfiguration

export const eHealthMdocData = {
  credentialConfigurationId: 'e-health-mdoc',
  format: ClaimFormat.MsoMdoc,
  credential: {
    docType: eHealthMdoc.doctype,
    namespaces: {
      'org.micov.vtr.1.': {
        ...eHealthPayload,
      },
      'org.micov.attestation.1': {
        ...eHealthPayload_2,
      },
    },
    validityInfo: {
      validFrom: eHealthPayload.issuance_date,
      validUntil: eHealthPayload.expiry_date,

      // Causes issue in google identity credential if not present
      // Update half year before expiry
      expectedUpdate: new Date(serverStartupTimeInMilliseconds + Math.floor(oneYearInMilliseconds / 2)),
      signed: eHealthPayload.issuance_date,
    },
  },
} satisfies StaticMdocSignInput

export const vwsIssuer = {
  tags: [eHealthDisplay.name],
  issuerId: '23474550-4a4b-4e60-bb3f-fc2a28d68bd5',
  credentialConfigurationsSupported: [
    {
      mso_mdoc: {
        configuration: eHealthMdoc,
        data: eHealthMdocData,
      },
    },
    {
      mso_mdoc: {
        configuration: over70mDLMdoc,
        data: over70mDLMdocData,
      },
    },
    {
      mso_mdoc: {
        configuration: age18mDLMdoc,
        data: age18mDLMdocData,
      },
    },
  ],
  batchCredentialIssuance: {
    batchSize: 10,
  },
  display: [
    {
      name: 'VWS',
      logo: {
        // We use the same logo for both issuers Koninkrijk der Nederlanden and VWS
        url: `${AGENT_HOST}/assets/issuers/nederlanden/issuer.png`,
        uri: `${AGENT_HOST}/assets/issuers/nederlanden/issuer.png`,
      },
    },
  ],
} satisfies PlaygroundIssuerOptions

export const vwsCredentialsData = {
  [eHealthMdocData.credentialConfigurationId]: eHealthMdocData,
  [over70mDLMdocData.credentialConfigurationId]: over70mDLMdocData,
  [age18mDLMdocData.credentialConfigurationId]: age18mDLMdocData,
}
