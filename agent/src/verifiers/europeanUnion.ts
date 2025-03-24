import { AGENT_HOST } from '../constants'
import type { PlaygroundVerifierOptions } from '../verifier'

export const europeanUnionVerifier = {
  verifierId: '01936907-56a3-7007-a61f-44bff8b5d175',
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/eu.png`,
    client_name: 'European Union',
  },
  requests: [],
} as const satisfies PlaygroundVerifierOptions
