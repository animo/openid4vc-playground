import { AGENT_HOST } from '../constants.js'
import type { PlaygroundVerifierOptions } from '../verifier.js'

/** An acceptor PSP: it requests a payment on behalf of a merchant, so the payee is not the verifier. */
export const tillwiseVerifier = {
  verifierId: 'e4b7c2a9-1f3d-4a6e-8b5c-9d0f2e7a3c41',
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/tillwise/verifier.png`,
    client_name: 'Tillwise',
  },
} as const satisfies PlaygroundVerifierOptions
