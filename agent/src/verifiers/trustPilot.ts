import { AGENT_HOST } from '../constants'
import type { PlaygroundVerifierOptions } from '../verifier'

export const trustPilotVerifier = {
  verifierId: '0193687f-20d8-720a-9139-ed939ba510fa',
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/trustpilot/verifier.webp`,
    client_name: 'TrustPilot',
  },
  requests: [],
} as const satisfies PlaygroundVerifierOptions
