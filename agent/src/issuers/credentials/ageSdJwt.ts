import { ClaimFormat, Kms } from '@credo-ts/core'
import { OpenId4VciCredentialFormatProfile } from '@credo-ts/openid4vc'
import type { SdJwtConfiguration } from '../../issuer'
import type { StaticSdJwtSignInput } from '../../types'
import {
  dateToSeconds,
  oneYearInMilliseconds,
  serverStartupTimeInMilliseconds,
  tenDaysInMilliseconds,
} from '../../utils/date'

const issuanceDate = new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds)
const expirationDate = new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds)

const ageSdJwtDisplay = {
  locale: 'en',
  name: 'Age',
  text_color: '#2F3544',
  background_color: '#F1F2F0',
} as const
export const ageSdJwt = {
  format: OpenId4VciCredentialFormatProfile.SdJwtDc,
  cryptographic_binding_methods_supported: ['jwk'],
  credential_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'age-sd-jwt',
  vct: 'urn:openid:interop:age:1',
  display: [ageSdJwtDisplay],
  credential_metadata: {
    display: [ageSdJwtDisplay],
  },
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} satisfies SdJwtConfiguration

export const ageSdJwtData = {
  credentialConfigurationId: 'age-sd-jwt',
  format: ClaimFormat.SdJwtDc,
  credential: {
    payload: {
      vct: ageSdJwt.vct,

      age_over_18: true,
      age_over_21: false,

      nbf: dateToSeconds(issuanceDate),
      exp: dateToSeconds(expirationDate),
    },
    disclosureFrame: {
      _sd: ['age_over_18', 'age_over_21'],
    },
  },
} satisfies StaticSdJwtSignInput
