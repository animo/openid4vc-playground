import type { OpenId4VpCreateVerifierOptions } from '@credo-ts/openid4vc'
import { agent } from './agent'
import type { MdocCredential, SdJwtCredential } from './verifiers/util'

export interface PlaygroundVerifierOptions {
  verifierId: string
  clientMetadata?: OpenId4VpCreateVerifierOptions['clientMetadata']
  requests: Array<{
    name: string
    purpose: string
    credentials: Array<SdJwtCredential | MdocCredential>
    // Indexes
    credential_sets?: Array<number[]>
  }>
  useCase?: {
    name: string
    icon: string
    tags: Array<string>
  }
}

export async function createOrUpdateVerifier(options: PlaygroundVerifierOptions) {
  if (await doesVerifierExist(options.verifierId)) {
    await agent.modules.openId4VcVerifier.updateVerifierMetadata({
      verifierId: options.verifierId,
      clientMetadata: options.clientMetadata,
    })
  } else {
    return agent.modules.openId4VcVerifier.createVerifier({
      clientMetadata: options.clientMetadata,
      verifierId: options.verifierId,
    })
  }
}

export async function doesVerifierExist(verifierId: string) {
  try {
    await agent.modules.openId4VcVerifier.getVerifierByVerifierId(verifierId)
    return true
  } catch (error) {
    return false
  }
}

export async function getVerifier(verifierId: string) {
  return agent.modules.openId4VcVerifier.getVerifierByVerifierId(verifierId)
}
