import { AGENT_HOST } from '../constants'
import type { PlaygroundVerifierOptions } from '../verifier'
import { pidMdocCredential, pidSdJwtCredential } from './util'

export const deineBankVerifier = {
  verifierId: '044721ed-af79-45ec-bab3-de85c3e722d0',
  useCase: {
    name: 'Open a bank account',
    icon: 'bank',
    tags: ['Federation support', 'Smart AI warnings', 'multi-credentials', 'mixed-credentials'],
  },

  clientMetadata: {
    logo_uri: `${AGENT_HOST}/assets/verifiers/deinebank.png`,
    client_name: 'DeineBank',
  },
  requests: [
    {
      name: 'DeineBank.de',
      purpose:
        'Um ein Konto bei DeineBank zu eröffnen, müssen wir Ihren Namen, Ihr Geburtsdatum, Ihren Wohnsitz und Ihre Staatsangehörigkeit überprüfen.',
      credentials: [
        pidSdJwtCredential({
          fields: [
            'given_name',
            'family_name',
            'birth_family_name',
            'birthdate',
            'age_equal_or_over.18',
            'place_of_birth.locality',
            'address.locality',
            'address.postal_code',
            'address.street_address',
            'nationalities',
          ],
        }),
      ],
    },
    // This one will include the RP access and registration certificate
    {
      name: 'RP A&A - DeineBank.de',
      purpose:
        'Um ein Konto bei DeineBank zu eröffnen, müssen wir Ihren Namen, Ihr Geburtsdatum, Ihren Wohnsitz und Ihre Staatsangehörigkeit überprüfen.',
      credentials: [
        pidSdJwtCredential({
          fields: [
            'given_name',
            'family_name',
            'birth_family_name',
            'birthdate',
            'age_equal_or_over.18',
            'place_of_birth.locality',
            'address.locality',
            'address.postal_code',
            'address.street_address',
            'nationalities',
          ],
        }),
      ],
    },
    {
      name: 'DeineBank.de',
      purpose:
        'Um ein Konto bei DeineBank zu eröffnen, müssen wir Ihren Namen, Ihr Geburtsdatum, Ihren Wohnsitz und Ihre Staatsangehörigkeit überprüfen.',

      credentials: [
        pidMdocCredential({
          fields: [
            'family_name',
            'given_name',
            'birth_date',
            'nationality',
            'resident_country',
            'resident_city',
            'resident_postal_code',
            'resident_street',
          ],
        }),
      ],
    },
  ],
} as const satisfies PlaygroundVerifierOptions
