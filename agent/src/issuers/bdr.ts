import { AGENT_HOST } from '../constants'
import type { PlaygroundIssuerOptions } from '../issuer'
import { eudiAgeMdoc, eudiAgeMdocData } from './credentials/eudiAgeMdoc'
import { eudiPidMdoc, eudiPidMdocData } from './credentials/eudiPidMdoc'
import { eudiPidSdJwt, eudiPidSdJwtData } from './credentials/eudiPidSdJwt'
import { mobileDriversLicenseMdoc, mobileDriversLicenseMdocData } from './credentials/mDLMdoc'

export const bdrIssuer = {
  tags: ['mDL', 'EUDI PID'],
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
        configuration: eudiPidSdJwt,
        data: eudiPidSdJwtData,
      },
      mso_mdoc: {
        configuration: eudiPidMdoc,
        data: eudiPidMdocData,
      },
    },
    {
      mso_mdoc: {
        configuration: eudiAgeMdoc,
        data: eudiAgeMdocData,
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
  [eudiPidSdJwtData.credentialConfigurationId]: eudiPidSdJwtData,
  [eudiPidMdocData.credentialConfigurationId]: eudiPidMdocData,
  [eudiAgeMdocData.credentialConfigurationId]: eudiAgeMdocData,
}
