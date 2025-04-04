import type {
  OpenId4VciCredentialConfigurationSupported,
  OpenId4VciSignMdocCredentials,
  OpenId4VciSignSdJwtCredentials,
  OpenId4VciSignW3cCredentials,
} from '@credo-ts/openid4vc'

export type CredentialDisplay = NonNullable<OpenId4VciCredentialConfigurationSupported['display']>[number]
export type StaticSdJwtSignInput = {
  credential: Omit<OpenId4VciSignSdJwtCredentials['credentials'][number], 'holder' | 'issuer'>
  credentialConfigurationId: string
} & Omit<OpenId4VciSignSdJwtCredentials, 'credentials'>
export type StaticMdocSignInput = {
  credential: Omit<OpenId4VciSignMdocCredentials['credentials'][number], 'issuerCertificate' | 'holderKey'>
  credentialConfigurationId: string
} & Omit<OpenId4VciSignMdocCredentials, 'credentials'>

export type StaticLdpVcSignInput = {
  credential: Omit<OpenId4VciSignW3cCredentials['credentials'][number], 'verificationMethod'>
  credentialConfigurationId: string
} & Omit<OpenId4VciSignW3cCredentials, 'credentials'>
