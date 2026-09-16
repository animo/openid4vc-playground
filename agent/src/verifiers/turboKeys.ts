import { AGENT_HOST } from '../constants.js'
import type { PlaygroundVerifierOptions } from '../verifier.js'

export const turboKeysVerifier = {
  verifierId: 'c01ea0f3-34df-41d5-89d1-50ef3d181855',
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/turbokeys/verifier.png`,
    client_name: 'TurboKeys',
  },
} as const satisfies PlaygroundVerifierOptions
