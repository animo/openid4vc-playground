import { ClaimFormat } from '@credo-ts/core'
import type {
  OpenId4VciCreateIssuerOptions,
  OpenId4VciCredentialRequestToCredentialMapper,
  OpenId4VciSignMdocCredential,
  OpenId4VciSignSdJwtCredential,
} from '@credo-ts/openid4vc'
import { agent } from './agent'
import { AGENT_HOST } from './constants'
import { issuers, issuersCredentialsData } from './issuers'
import { getX509Certificate } from './keyMethods'

export async function createOrUpdateIssuer(options: OpenId4VciCreateIssuerOptions & { issuerId: string }) {
  if (await doesIssuerExist(options.issuerId)) {
    await agent.modules.openId4VcIssuer.updateIssuerMetadata(options)
  } else {
    return agent.modules.openId4VcIssuer.createIssuer(options)
  }
}

export async function doesIssuerExist(issuerId: string) {
  try {
    await agent.modules.openId4VcIssuer.getIssuerByIssuerId(issuerId)
    return true
  } catch (error) {
    return false
  }
}

export async function getIssuer(issuerId: string) {
  return agent.modules.openId4VcIssuer.getIssuerByIssuerId(issuerId)
}

export function getIssuerIdForCredentialConfigurationId(credentialConfigurationId: string) {
  const issuer = issuers.find(({ credentialsSupported }) =>
    credentialsSupported.find((s) => s.id === credentialConfigurationId)
  )

  if (!issuer) {
    throw new Error(`Issuer not found for credential configuration id ${credentialConfigurationId}`)
  }

  return issuer.issuerId
}

export const credentialRequestToCredentialMapper: OpenId4VciCredentialRequestToCredentialMapper = async ({
  // FIXME: it would be useful if holderBinding would include some metadata on the key type / alg used
  // for the key binding
  holderBinding,
  credentialConfigurationIds,
}): Promise<OpenId4VciSignMdocCredential | OpenId4VciSignSdJwtCredential> => {
  const credentialConfigurationId = credentialConfigurationIds[0]

  const x509Certificate = getX509Certificate()
  const credentialData = issuersCredentialsData[credentialConfigurationId as keyof typeof issuersCredentialsData]
  if (!credentialData) {
    throw new Error(`Unsupported credential configuration id ${credentialConfigurationId}`)
  }

  if (credentialData.format === ClaimFormat.SdJwtVc) {
    return {
      ...credentialData,
      holder: holderBinding,
      issuer: {
        method: 'x5c',
        x5c: [x509Certificate],
        issuer: AGENT_HOST,
      },
    } satisfies OpenId4VciSignSdJwtCredential
  }

  if (credentialData.format === ClaimFormat.MsoMdoc) {
    return {
      ...credentialData,
      holderKey: holderBinding.key,
      issuerCertificate: x509Certificate,
    } satisfies OpenId4VciSignMdocCredential
  }

  throw new Error(`Unsupported credential ${credentialConfigurationId}`)
}
