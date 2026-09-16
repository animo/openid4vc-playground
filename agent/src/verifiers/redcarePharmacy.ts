import { AGENT_HOST } from '../constants.js'
import type { PlaygroundVerifierOptions } from '../verifier.js'

export const redcarePharmacyVerifier = {
  verifierId: '01936901-2390-722e-b9f1-bf42db4db7ca',
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/redcare.png`,
    client_name: 'Redcare Pharmacy',
  },
} as const satisfies PlaygroundVerifierOptions
