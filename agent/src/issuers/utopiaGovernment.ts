import { AGENT_HOST } from '../constants.js'
import type { PlaygroundIssuerOptions } from '../issuer.js'
import { eudiAgeMdoc, eudiAgeMdocData } from './credentials/eudiAgeMdoc.js'
import { eudiPidMdoc, eudiPidMdocData } from './credentials/eudiPidMdoc.js'
import { eudiPidSdJwt, eudiPidSdJwtData } from './credentials/eudiPidSdJwt.js'
import { mobileDriversLicenseMdoc, mobileDriversLicenseMdocData } from './credentials/mDLMdoc.js'
import { photoIdMdoc, photoIdMdocData } from './credentials/photoIdMdoc.js'

const mobileDriversLicenseMdocDataUtopia = {
  ...mobileDriversLicenseMdocData,
  credentialConfigurationId: `${mobileDriversLicenseMdocData.credentialConfigurationId}-utopia`,
}
const eudiPidMdocDataUtopia = {
  ...eudiPidMdocData,
  credentialConfigurationId: `${eudiPidMdocData.credentialConfigurationId}-utopia`,
}
const eudiPidSdJwtDataUtopia = {
  ...eudiPidSdJwtData,
  credentialConfigurationId: `${eudiPidSdJwtData.credentialConfigurationId}-utopia`,
}
const eudiAgeMdocDataUtopia = {
  ...eudiAgeMdocData,
  credentialConfigurationId: `${eudiAgeMdocData.credentialConfigurationId}-utopia`,
}
const photoIdMdocDataUtopia = {
  ...photoIdMdocData,
  credentialConfigurationId: `${photoIdMdocData.credentialConfigurationId}-utopia`,
}

export const utopiaGovernmentIssuer = {
  tags: ['mDL', 'EUDI PID', 'Photo ID', 'EUDI Age'],
  issuerId: 'b39e71cf-9cf1-4723-a9cd-66f42a510b36',
  credentialConfigurationsSupported: [
    {
      mso_mdoc: {
        configuration: mobileDriversLicenseMdoc,
        data: mobileDriversLicenseMdocDataUtopia,
      },
    },
    {
      'dc+sd-jwt': {
        configuration: eudiPidSdJwt,
        data: eudiPidSdJwtDataUtopia,
      },
      mso_mdoc: {
        configuration: eudiPidMdoc,
        data: eudiPidMdocDataUtopia,
      },
    },
    {
      mso_mdoc: {
        configuration: photoIdMdoc,
        data: photoIdMdocDataUtopia,
      },
    },
    {
      mso_mdoc: {
        configuration: eudiAgeMdoc,
        data: eudiAgeMdocDataUtopia,
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
  [mobileDriversLicenseMdocDataUtopia.credentialConfigurationId]: mobileDriversLicenseMdocDataUtopia,
  [eudiPidSdJwtDataUtopia.credentialConfigurationId]: eudiPidSdJwtDataUtopia,
  [eudiPidMdocDataUtopia.credentialConfigurationId]: eudiPidMdocDataUtopia,
  [photoIdMdocDataUtopia.credentialConfigurationId]: photoIdMdocDataUtopia,
  [eudiAgeMdocDataUtopia.credentialConfigurationId]: eudiAgeMdocDataUtopia,
}
