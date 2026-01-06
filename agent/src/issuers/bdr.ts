import { AGENT_HOST } from '../constants'
import type { PlaygroundIssuerOptions } from '../issuer'
import { eudiAgeMdoc, eudiAgeMdocData } from './credentials/eudiAgeMdoc'
import { eudiPidMdoc, eudiPidMdocData } from './credentials/eudiPidMdoc'
import { eudiPidSdJwt, eudiPidSdJwtData } from './credentials/eudiPidSdJwt'
import { mobileDriversLicenseMdoc, mobileDriversLicenseMdocData } from './credentials/mDLMdoc'

const mobileDriversLicenseMdocDataBdr = {
  ...mobileDriversLicenseMdocData,
  credentialConfigurationId: `${mobileDriversLicenseMdocData.credentialConfigurationId}-bdr`,
}
const eudiPidMdocDataBdr = {
  ...eudiPidMdocData,
  credentialConfigurationId: `${eudiPidMdocData.credentialConfigurationId}-bdr`,
}
const eudiPidSdJwtDataBdr = {
  ...eudiPidSdJwtData,
  credentialConfigurationId: `${eudiPidSdJwtData.credentialConfigurationId}-bdr`,
}
const eudiAgeMdocDataBdr = {
  ...eudiAgeMdocData,
  credentialConfigurationId: `${eudiAgeMdocData.credentialConfigurationId}-bdr`,
}

export const bdrIssuer = {
  tags: ['mDL', 'EUDI PID'],
  issuerId: '188e2459-6da8-4431-9062-2fcdac274f41',
  credentialConfigurationsSupported: [
    {
      mso_mdoc: {
        configuration: mobileDriversLicenseMdoc,
        data: mobileDriversLicenseMdocDataBdr,
      },
    },
    {
      'dc+sd-jwt': {
        configuration: eudiPidSdJwt,
        data: eudiPidSdJwtDataBdr,
      },
      mso_mdoc: {
        configuration: eudiPidMdoc,
        data: eudiPidMdocDataBdr,
      },
    },
    {
      mso_mdoc: {
        configuration: eudiAgeMdoc,
        data: eudiAgeMdocDataBdr,
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
  [mobileDriversLicenseMdocDataBdr.credentialConfigurationId]: mobileDriversLicenseMdocDataBdr,
  [eudiPidSdJwtDataBdr.credentialConfigurationId]: eudiPidSdJwtDataBdr,
  [eudiPidMdocDataBdr.credentialConfigurationId]: eudiPidMdocDataBdr,
  [eudiAgeMdocDataBdr.credentialConfigurationId]: eudiAgeMdocDataBdr,
}
