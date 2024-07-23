import { JwaSignatureAlgorithm } from '@credo-ts/core'
import {
  OpenId4VciCredentialFormatProfile,
  type OpenId4VciCredentialSupportedWithId,
  type OpenId4VciIssuerMetadataDisplay,
} from '@credo-ts/openid4vc'

const ANIMO_DARK_BACKGROUND = '#202223'
const WHITE = '#FFFFFF'

export const issuerDisplay = [
  {
    background_color: ANIMO_DARK_BACKGROUND,
    name: 'Animo + Funke OpenID4VC Playground',
    locale: 'en',
    logo: {
      alt_text: 'Animo logo',
      url: 'https://i.imgur.com/PUAIUed.jpeg',
    },
    text_color: WHITE,
  },
] satisfies OpenId4VciIssuerMetadataDisplay[]

export const mockPidOpenId4VcPlaygroundCredentialSdJwtVcJwk = {
  id: 'mockPidOpenId4VcPlaygroundSdJwtVcJwk',
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  vct: 'https://example.bmi.bund.de/credential/pid/1.0',
  cryptographic_binding_methods_supported: ['jwk'],
  credential_signing_alg_values_supported: [JwaSignatureAlgorithm.ES256],
  display: [
    {
      name: 'SD-JWT-VC',
      description: 'JWK holder binding',
      background_color: ANIMO_DARK_BACKGROUND,
      locale: 'en',
      text_color: WHITE,
    },
  ],
} as const satisfies OpenId4VciCredentialSupportedWithId

export const credentialsSupported = [
  mockPidOpenId4VcPlaygroundCredentialSdJwtVcJwk,
] as const satisfies OpenId4VciCredentialSupportedWithId[]

type CredentialSupportedId = (typeof credentialsSupported)[number]['id']
export const credentialSupportedIds = credentialsSupported.map((s) => s.id) as [
  CredentialSupportedId,
  ...CredentialSupportedId[],
]
