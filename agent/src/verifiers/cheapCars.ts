import { AGENT_HOST } from '../constants'
import type { PlaygroundVerifierOptions } from '../verifier'
import { pidMdocInputDescriptor, pidSdJwtInputDescriptor, sdJwtInputDescriptor } from './util'

export const cheapCarsVerifier = {
  verifierId: '019368fe-ee82-7990-880c-7f0ceb92b0aa',
  useCase:
    'Rent a car | Showcases: multi-credentials | mixed-credentials | Query languages | Smart AI warnings | Federation support',
  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/cheap-cars.webp`,
    client_name: 'Cheap Cars',
  },
  presentationRequests: [
    {
      id: '019368ff-0ec7-7eec-bdbf-861e512d0924',
      name: 'PID and MDL - Secure car reservations (vc+sd-jwt) - Not trust anchor - AI over asking',
      purpose: 'To secure your car reservations and finalize the transaction, we require the following attributes',
      input_descriptors: [
        // TODO: Add more fields
        pidMdocInputDescriptor({
          fields: [
            'document_number',
            'issue_date',
            'expiry_date',
            'issuing_country',
            'issuing_authority',
            'driving_priviliges',
          ],
        }),
        // TODO: Add more fields
        pidSdJwtInputDescriptor({
          fields: ['given_name', 'family_name', 'birth_date', 'address.country', 'nationalities'],
        }),
      ],
    },
  ],
  dcqlRequests: [],
} as const satisfies PlaygroundVerifierOptions
