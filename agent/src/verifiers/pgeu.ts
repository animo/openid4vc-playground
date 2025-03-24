import { AGENT_HOST } from '../constants'
import type { PlaygroundVerifierOptions } from '../verifier'

export const pgeuVerifier = {
  verifierId: '01936903-8879-733f-8eaf-6f2fa862099c',
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/pgeu.png`,
    client_name: 'The Pharmaceutical Group of the European Union',
  },
  requests: [],
} as const satisfies PlaygroundVerifierOptions
