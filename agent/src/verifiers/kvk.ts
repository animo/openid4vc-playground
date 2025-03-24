import { AGENT_HOST } from '../constants'
import type { PlaygroundVerifierOptions } from '../verifier'

export const kvkVerifier = {
  verifierId: '0193687b-0c27-7b82-a686-ff857dc6bbb3',
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/kvk/verifier.png`,
    client_name: 'KVK',
  },
  requests: [],
} as const satisfies PlaygroundVerifierOptions
