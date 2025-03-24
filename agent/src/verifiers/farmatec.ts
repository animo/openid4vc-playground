import { AGENT_HOST } from '../constants'
import type { PlaygroundVerifierOptions } from '../verifier'

export const farmatecVerifier = {
  verifierId: '01936904-6f3c-7ccd-9e80-63e6d4945d93',
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/farmatec.png`,
    client_name: 'Farmatec',
  },
  requests: [],
} as const satisfies PlaygroundVerifierOptions
