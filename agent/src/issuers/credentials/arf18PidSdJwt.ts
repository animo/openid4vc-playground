import { ClaimFormat, JwaSignatureAlgorithm } from '@credo-ts/core'
import { OpenId4VciCredentialFormatProfile } from '@credo-ts/openid4vc'
import { AGENT_HOST } from '../../constants'
import type { SdJwtConfiguration } from '../../issuer'
import type { StaticSdJwtSignInput } from '../../types'
import {
  dateToSeconds,
  oneYearInMilliseconds,
  serverStartupTimeInMilliseconds,
  tenDaysInMilliseconds,
} from '../../utils/date'
import { loadJPEGBufferSync } from '../../utils/image'

const issuanceDate = new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds)
const expirationDate = new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds)
const erikaPortrait = loadJPEGBufferSync(`${__dirname}/../../../assets/erika.jpeg`)

export const arfCompliantPidSdJwt = {
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  cryptographic_binding_methods_supported: ['jwk'],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  scope: 'government-arf-18-pid-sd-jwt',
  vct: 'urn:eudi:pid:1',
  display: [
    {
      locale: 'en',
      name: 'ARF 1.8 PID',
      text_color: '#2F3544',
      background_color: '#F1F2F0',
      background_image: {
        url: `${AGENT_HOST}/assets/issuers/bdr/pid-credential.png`,
        uri: `${AGENT_HOST}/assets/issuers/bdr/pid-credential.png`,
      },
    },
  ],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [JwaSignatureAlgorithm.ES256],
    },
  },
} satisfies SdJwtConfiguration

export const arfCompliantPidSdJwtData = {
  credentialConfigurationId: 'government-arf-18-pid-sd-jwt',
  format: ClaimFormat.SdJwtVc,
  credential: {
    payload: {
      vct: arfCompliantPidSdJwt.vct,
      // Mandatory
      family_name: 'Mustermann',
      given_name: 'Erika',
      birthdate: '1964-08-12',

      place_of_birth: {
        country: 'NL',
        region: 'Utrecht',
        locality: 'Utrecht',
      },
      nationalities: ['NL'],

      address: {
        region: 'Utrecht',
        locality: 'Utrecht',
        country: 'NL',
        postal_code: '90210',
      },

      // Mandatory metadata
      issuing_country: 'NL',
      issuing_authority: 'NL',

      // Extra
      age_equal_or_over: {
        18: true,
      },
      portrait: `data:image/jpeg;base64,${erikaPortrait.toString('base64')}`,

      issuance_date: issuanceDate.toISOString(),
      expiry_date: expirationDate.toISOString(),

      nbf: dateToSeconds(issuanceDate),
      exp: dateToSeconds(expirationDate),
    },
    disclosureFrame: {
      _sd: [
        // Mandatory
        'family_name',
        'given_name',
        'birthdate',
        'portrait',
        'issuance_date',
        'nationalities',
      ],
      place_of_birth: {
        _sd: ['country', 'region', 'locality'],
      },
      address: {
        _sd: ['country', 'region', 'locality', 'postal_code'],
      },
      age_equal_or_over: {
        _sd: ['18'],
      },
    },
  },
} satisfies StaticSdJwtSignInput
