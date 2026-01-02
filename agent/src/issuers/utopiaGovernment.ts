import { AGENT_HOST } from '../constants'
import type { PlaygroundIssuerOptions } from '../issuer'
import { eudiAgeMdoc, eudiAgeMdocData } from './credentials/eudiAgeMdoc'
import { eudiPidMdoc, eudiPidMdocData } from './credentials/eudiPidMdoc'
import { eudiPidSdJwt, eudiPidSdJwtData } from './credentials/eudiPidSdJwt'
import { mobileDriversLicenseMdoc, mobileDriversLicenseMdocData } from './credentials/mDLMdoc'
import { photoIdMdoc, photoIdMdocData } from './credentials/photoIdMdoc'

export const utopiaGovernmentIssuer = {
  tags: ['mDL', 'EUDI PID', 'Photo ID', 'EUDI Age'],
  issuerId: 'b39e71cf-9cf1-4723-a9cd-66f42a510b36',
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
        configuration: photoIdMdoc,
        data: photoIdMdocData,
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
  playgroundDisplayName: 'Utopia Government',
  display: [
    {
      locale: 'en',
      name: 'Utopia Government',
      logo: {
        uri: `${AGENT_HOST}/assets/verifiers/government.png`,
      },
    },
    {
      locale: 'nl',
      name: 'Utopia Overheid',
      logo: {
        uri: `${AGENT_HOST}/assets/verifiers/government.png`,
      },
    },
    {
      locale: 'fi',
      name: 'Utopian hallitus',
      logo: {
        uri: `${AGENT_HOST}/assets/verifiers/government.png`,
      },
    },
    {
      locale: 'sv',
      name: 'Utopia regering',
      logo: {
        uri: `${AGENT_HOST}/assets/verifiers/government.png`,
      },
    },
    {
      locale: 'de',
      name: 'Utopia Regierung',
      logo: {
        uri: `${AGENT_HOST}/assets/verifiers/government.png`,
      },
    },
    {
      locale: 'sq',
      name: 'Qeveria e Utopisë',
      logo: {
        uri: `${AGENT_HOST}/assets/verifiers/government.png`,
      },
    },
    {
      locale: 'pt',
      name: 'Governo da Utopia',
      logo: {
        uri: `${AGENT_HOST}/assets/verifiers/government.png`,
      },
    },
  ],
} satisfies PlaygroundIssuerOptions

export const utopiaGovernmentData = {
  [mobileDriversLicenseMdocData.credentialConfigurationId]: mobileDriversLicenseMdocData,
  [eudiPidSdJwtData.credentialConfigurationId]: eudiPidSdJwtData,
  [eudiPidMdocData.credentialConfigurationId]: eudiPidMdocData,
  [photoIdMdocData.credentialConfigurationId]: photoIdMdocData,
  [eudiAgeMdocData.credentialConfigurationId]: eudiAgeMdocData,
}
