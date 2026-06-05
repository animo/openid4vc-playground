import { AGENT_HOST } from '../constants.js'
import type { PlaygroundVerifierOptions } from '../verifier.js'

export const huVerifier = {
  verifierId: '0193fe01-4b3a-7c2e-9d8e-1c2d3e4f5a6b',
  useCase: {
    name: 'Hogeschool Utrecht',
    icon: 'education',
    tags: [],
  },
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/hogeschool-utrecht.png`,
    client_name: 'Hogeschool Utrecht',
  },
  requests: [
    {
      name: 'Arbeidsmarkt Strateeg',
      purpose: 'Verify an Arbeidsmarkt Strateeg micro-credential.',
      credentials: [
        {
          format: 'vc+sd-jwt',
          type_values: [['VerifiableCredential', 'OpenBadgeCredential']],
          fields: [
            'credentialSubject.achievement',
            {
              path: 'credentialSubject.achievement.name',
              values: ['Arbeidsmarkt Strateeg'],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
