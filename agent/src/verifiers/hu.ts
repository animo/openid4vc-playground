import { AGENT_HOST } from '../constants.js'
import type { PlaygroundVerifierOptions } from '../verifier.js'

export const huVerifier = {
  verifierId: '0193fe01-4b3a-7c2e-9d8e-1c2d3e4f5a6b',
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/hogeschool-utrecht.png`,
    client_name: 'Hogeschool Utrecht',
  },
} as const satisfies PlaygroundVerifierOptions
