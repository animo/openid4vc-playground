import type { OpenId4VpCreateVerifierOptions } from '@credo-ts/openid4vc'
import { agent } from './agent.js'
import type { MdocCredential, SdJwtCredential } from './verifiers/util.js'

export interface PlaygroundVerifierOptions {
  verifierId: string
  clientMetadata?: OpenId4VpCreateVerifierOptions['clientMetadata'] & { [clientName: `client_name#${string}`]: string }
  requests: Array<{
    name: string
    purpose: string
    credentials: Array<SdJwtCredential | MdocCredential>
    // Indexes
    credential_sets?: Array<number[]>
    transaction_data?: Array<{
      type: string
      subtype?: string
      credential_ids: [string, ...string[]]
      transaction_data_hashes_alg?: [string, ...string[]]
      payload: Record<string, unknown>
    }>
  }>
  useCase?: {
    name: string
    icon: string
    tags: Array<string>
  }
}

export async function createOrUpdateVerifier(options: PlaygroundVerifierOptions) {
  if (await doesVerifierExist(options.verifierId)) {
    await agent.openid4vc.verifier.updateVerifierMetadata({
      verifierId: options.verifierId,
      clientMetadata: options.clientMetadata,
    })
  } else {
    return agent.openid4vc.verifier.createVerifier({
      clientMetadata: options.clientMetadata,
      verifierId: options.verifierId,
    })
  }
}

export async function doesVerifierExist(verifierId: string) {
  try {
    await agent.openid4vc.verifier.getVerifierByVerifierId(verifierId)
    return true
  } catch (_error) {
    return false
  }
}

export async function getVerifier(verifierId: string) {
  return agent.openid4vc.verifier.getVerifierByVerifierId(verifierId)
}
