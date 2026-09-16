import { AGENT_HOST } from '../constants.js'
import type { PlaygroundVerifierOptions } from '../verifier.js'

/**
 * The verifier used for all presentation requests created in the playground, and for
 * presentation during issuance.
 */
export const utopiaGovernmentVerifier = {
  verifierId: '8caaebcc-d48c-471b-86b0-a534e15c4774',
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/government.png`,
    client_name: 'Utopia Government',
    'client_name#nl': 'Utopia Overheid',
    'client_name#en': 'Utopia Government',
    'client_name#fi': 'Utopian hallitus',
    'client_name#sv': 'Utopia regering',
    'client_name#de': 'Utopia Regierung',
    'client_name#sq': 'Qeveria e Utopisë',
    'client_name#pt': 'Governo da Utopia',
  } as const,
} as const satisfies PlaygroundVerifierOptions
