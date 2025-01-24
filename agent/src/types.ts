import type {
  OpenId4VciCredentialConfigurationSupported,
  OpenId4VciSignMdocCredentials,
  OpenId4VciSignSdJwtCredentials,
} from '@credo-ts/openid4vc'

export type CredentialDisplay = NonNullable<OpenId4VciCredentialConfigurationSupported['display']>[number]
export type StaticSdJwtSignInput = {
  credential: Omit<OpenId4VciSignSdJwtCredentials['credentials'][number], 'holder' | 'issuer'>
} & Omit<OpenId4VciSignSdJwtCredentials, 'credentials'>
export type StaticMdocSignInput = {
  credential: Omit<OpenId4VciSignMdocCredentials['credentials'][number], 'issuerCertificate' | 'holderKey'>
} & Omit<OpenId4VciSignMdocCredentials, 'credentials'>
