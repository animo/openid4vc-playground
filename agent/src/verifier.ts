import type { OpenId4VcSiopCreateVerifierOptions } from '@credo-ts/openid4vc'
import { agent } from './agent'
import type { DifPresentationExchangeDefinitionV2 } from '@credo-ts/core'

export interface PlaygroundVerifierOptions {
  verifierId: string
  clientMetadata?: OpenId4VcSiopCreateVerifierOptions['clientMetadata']
  presentationRequests: Array<DifPresentationExchangeDefinitionV2>
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
