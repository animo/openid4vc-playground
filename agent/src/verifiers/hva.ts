import { AGENT_HOST } from '../constants.js'
import type { PlaygroundVerifierOptions } from '../verifier.js'

export const hvaVerifier = {
  verifierId: '0193fe01-4b3a-7c2e-9d8e-1c2d3e4f5a6b',
  useCase: {
    name: 'Verify Diploma Supplement',
    icon: 'default',
    tags: [],
  },
  clientMetadata: {
    // TODO: add logo
    logo_uri: `${AGENT_HOST}/assets/verifiers/hva.png`,
    client_name: 'HvA Verifier',
  },
  requests: [
    {
      // TODO: set correct name, purpose, and credentials.
      name: 'Diploma Supplement',
      purpose: 'Verify a diploma supplement credential.',
      credentials: [
        {
          format: 'vc+sd-jwt',
          type_values: [['Test']],
          fields: ['attribute'],
        },
      ],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
