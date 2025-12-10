import { AGENT_HOST } from '../constants'
import type { PlaygroundIssuerOptions } from '../issuer'
import { ageSdJwt, ageSdJwtData } from './credentials/ageSdJwt'
import { arfPidMdoc, arfPidMdocData } from './credentials/arf18PidMdoc'
import { arfCompliantPidSdJwt, arfCompliantPidSdJwtData } from './credentials/arf18PidSdJwt'
import { mobileDriversLicenseMdoc, mobileDriversLicenseMdocData } from './credentials/mDLMdoc'
import { openIdSdJwt, openIdSdJwtData } from './credentials/openIDSdJwt'
import { photoIdMdoc, photoIdMdocData } from './credentials/photoIdMdoc'

export const utopiaGovernmentIssuer = {
  tags: ['mDL', 'ARF 1.8 PID', 'Photo ID', 'OpenID', 'Age'],
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
        configuration: arfCompliantPidSdJwt,
        data: arfCompliantPidSdJwtData,
      },
      mso_mdoc: {
        configuration: arfPidMdoc,
        data: arfPidMdocData,
      },
    },
    {
      mso_mdoc: {
        configuration: photoIdMdoc,
        data: photoIdMdocData,
      },
    },
    {
      'dc+sd-jwt': {
        configuration: openIdSdJwt,
        data: openIdSdJwtData,
      },
    },
    {
      'dc+sd-jwt': {
        configuration: ageSdJwt,
        data: ageSdJwtData,
      },
    },
  ] as const,
  batchCredentialIssuance: {
    batchSize: 10,
  },
  playgroundDisplayName: 'Utopia Government (OpenID Interop Event)',
  display: [
    {
      locale: 'en',
      name: 'Utopia Government',
      logo: {
        url: `${AGENT_HOST}/assets/verifiers/government.png`,
        uri: `${AGENT_HOST}/assets/verifiers/government.png`,
      },
    },
    {
      locale: 'nl',
      name: 'Utopia Overheid',
      logo: {
        url: `${AGENT_HOST}/assets/verifiers/government.png`,
        uri: `${AGENT_HOST}/assets/verifiers/government.png`,
      },
    },
    {
      locale: 'fi',
      name: 'Utopian hallitus',
      logo: {
        url: `${AGENT_HOST}/assets/verifiers/government.png`,
        uri: `${AGENT_HOST}/assets/verifiers/government.png`,
      },
    },
    {
      locale: 'sv',
      name: 'Utopia regering',
      logo: {
        url: `${AGENT_HOST}/assets/verifiers/government.png`,
        uri: `${AGENT_HOST}/assets/verifiers/government.png`,
      },
    },
    {
      locale: 'de',
      name: 'Utopia Regierung',
      logo: {
        url: `${AGENT_HOST}/assets/verifiers/government.png`,
        uri: `${AGENT_HOST}/assets/verifiers/government.png`,
      },
    },
    {
      locale: 'sq',
      name: 'Qeveria e Utopisë',
      logo: {
        url: `${AGENT_HOST}/assets/verifiers/government.png`,
        uri: `${AGENT_HOST}/assets/verifiers/government.png`,
      },
    },
    {
      locale: 'pt',
      name: 'Governo da Utopia',
      logo: {
        url: `${AGENT_HOST}/assets/verifiers/government.png`,
        uri: `${AGENT_HOST}/assets/verifiers/government.png`,
      },
    },
  ],
} satisfies PlaygroundIssuerOptions

export const utopiaGovernmentData = {
  [mobileDriversLicenseMdocData.credentialConfigurationId]: mobileDriversLicenseMdocData,
  [arfCompliantPidSdJwtData.credentialConfigurationId]: arfCompliantPidSdJwtData,
  [arfPidMdocData.credentialConfigurationId]: arfPidMdocData,
  [photoIdMdocData.credentialConfigurationId]: photoIdMdocData,
  [openIdSdJwtData.credentialConfigurationId]: openIdSdJwtData,
  [ageSdJwtData.credentialConfigurationId]: ageSdJwtData,
}
