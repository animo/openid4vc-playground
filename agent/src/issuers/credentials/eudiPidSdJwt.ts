import { ClaimFormat, Kms } from '@credo-ts/core'
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

const eudiPidSdJwtDisplay = {
  locale: 'en',
  name: 'EUDI PID',
  text_color: '#2F3544',
  background_color: '#F1F2F0',
  background_image: {
    url: `${AGENT_HOST}/assets/credentials/pid.png`,
    uri: `${AGENT_HOST}/assets/credentials/pid.png`,
  },
} as const

export const eudiPidSdJwt = {
  format: OpenId4VciCredentialFormatProfile.SdJwtDc,
  cryptographic_binding_methods_supported: ['jwk'],
  credential_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'eudi-pid-sd-jwt',
  vct: 'urn:eudi:pid:1',
  display: [eudiPidSdJwtDisplay],
  credential_metadata: { display: [eudiPidSdJwtDisplay] },
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} satisfies SdJwtConfiguration

export const eudiPidSdJwtData = {
  credentialConfigurationId: 'eudi-pid-sd-jwt',
  format: ClaimFormat.SdJwtDc,
  credential: {
    payload: {
      vct: eudiPidSdJwt.vct,

      // Mandatory attributes (Section 2.2)
      family_name: 'Mustermann',
      given_name: 'Erika',
      birthdate: '1964-08-12', // ISO 8601-1 YYYY-MM-DD format
      place_of_birth: {
        country: 'NL',
        region: 'Utrecht',
        locality: 'Utrecht',
      },
      nationalities: ['NL'],

      // Optional attributes (Section 2.3)
      address: {
        formatted: 'Rietveld 1, 90210 Utrecht',
        street_address: 'Rietveld',
        house_number: '1',
        locality: 'Utrecht',
        region: 'Utrecht',
        postal_code: '90210',
        country: 'NL',
      },
      portrait: `data:image/jpeg;base64,${erikaPortrait.toString('base64')}`,

      // Mandatory metadata (Section 2.4)
      date_of_expiry: expirationDate.toISOString().split('T')[0], // YYYY-MM-DD format
      issuing_authority: 'Rijksdienst voor Identiteitsgegevens',
      issuing_country: 'NL',

      // Optional metadata from Section 2.6
      date_of_issuance: issuanceDate.toISOString().split('T')[0], // YYYY-MM-DD format

      // Technical validity period (JWT standard claims)
      nbf: dateToSeconds(issuanceDate),
      exp: dateToSeconds(expirationDate),
    },
    disclosureFrame: {
      _sd: [
        // Mandatory attributes - individually disclosable
        'family_name',
        'given_name',
        'birthdate',
        'nationalities',

        // Optional attributes
        'portrait',

        // Metadata
        'date_of_issuance',
      ],
      place_of_birth: {
        _sd: ['country', 'region', 'locality'],
      },
      address: {
        _sd: ['formatted', 'street_address', 'house_number', 'locality', 'region', 'postal_code', 'country'],
      },
    },
  },
} satisfies StaticSdJwtSignInput
