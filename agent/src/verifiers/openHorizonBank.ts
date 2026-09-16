import { AGENT_HOST } from '../constants.js'
import type { PlaygroundVerifierOptions } from '../verifier.js'

export const openHorizonBankVerifier = {
  verifierId: '019368e8-54aa-788e-81c4-e60a59a09d87',
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/openbank.png`,
    client_name: 'Open Horizon Bank',
  },
} as const satisfies PlaygroundVerifierOptions
