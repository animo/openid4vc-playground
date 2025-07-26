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

export const openIdSdJwt = {
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  cryptographic_binding_methods_supported: ['jwk'],
  cryptographic_suites_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'openid-id-sd-jwt',
  vct: 'urn:openid:interop:id:1',
  display: [
    {
      locale: 'en',
      name: 'OpenID ID',
      text_color: '#2F3544',
      background_color: '#F1F2F0',
      background_image: {
        uri: '',
      },
    },
  ],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} satisfies SdJwtConfiguration

export const openIdSdJwtData = {
  credentialConfigurationId: 'openid-id-sd-jwt',
  format: ClaimFormat.SdJwtVc,
  credential: {
    payload: {
      vct: openIdSdJwt.vct,

      openid: '3b158a23-82d2-4933-80b0-1d3b13a1461e',
      family_name: 'Mustermann',
      given_name: 'Erika',

      nbf: dateToSeconds(issuanceDate),
      exp: dateToSeconds(expirationDate),
    },
    disclosureFrame: {
      _sd: ['family_name', 'given_name', 'openid'],
    },
  },
} satisfies StaticSdJwtSignInput
