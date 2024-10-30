import type {
  OpenId4VciCredentialSupported,
  OpenId4VciSignMdocCredential,
  OpenId4VciSignSdJwtCredential,
} from '@credo-ts/openid4vc'

export type CredentialDisplay = NonNullable<OpenId4VciCredentialSupported['display']>[number]
export type StaticSdJwtSignInput = Omit<OpenId4VciSignSdJwtCredential, 'holder' | 'issuer'>
export type StaticMdocSignInput = Omit<OpenId4VciSignMdocCredential, 'issuerCertificate' | 'holderKey'>
