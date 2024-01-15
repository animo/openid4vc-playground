import { JwaSignatureAlgorithm } from "@aries-framework/core";
import {
  OpenId4VciCredentialSupportedWithId,
  OpenId4VciCredentialFormatProfile,
  OpenId4VciIssuerMetadataDisplay,
} from "@aries-framework/openid4vc";

export const issuerDisplay = [
  {
    background_color: "#FFFFFF",
    description: "Animo OpenID4VC Playground",
    name: "Animo OpenID4VC Playground",
    locale: "en",
    logo: {
      alt_text: "Animo logo",
      url: "https://i.imgur.com/8B37E4a.png",
    },
    text_color: "#E17471", // animo red
  },
] satisfies OpenId4VciIssuerMetadataDisplay[];

export const animoOpenId4VcPlaygroundCredentialSdJwtVcDid = {
  id: "AnimoOpenId4VcPlaygroundSdJwtVcDid",
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  vct: "AnimoOpenId4VcPlayground",
  cryptographic_binding_methods_supported: ["did:key", "did:jwk"],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.EdDSA],
  display: [
    {
      name: "Animo OpenID4VC Playground - SD-JWT-VC (did holder binding)",
      description: "Issued using Animo's OpenID4VC Playground",
      background_color: "#FFFFFF",
      locale: "en",
      text_color: "#E17471", // animo red (make animo blue?)
    },
  ],
} as const satisfies OpenId4VciCredentialSupportedWithId;

export const animoOpenId4VcPlaygroundCredentialSdJwtVcJwk = {
  id: "AnimoOpenId4VcPlaygroundSdJwtVcJwk",
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  vct: "AnimoOpenId4VcPlayground",
  cryptographic_binding_methods_supported: ["jwk"],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.EdDSA],
  display: [
    {
      name: "Animo OpenID4VC Playground - SD-JWT-VC (jwk holder binding)",
      description: "Issued using Animo's OpenID4VC Playground",
      background_color: "#FFFFFF",
      locale: "en",
      text_color: "#E17471", // animo red (make animo blue?)
    },
  ],
} as const satisfies OpenId4VciCredentialSupportedWithId;

export const animoOpenId4VcPlaygroundCredentialJwtVc = {
  id: "AnimoOpenId4VcPlaygroundJwtVc",
  format: OpenId4VciCredentialFormatProfile.JwtVcJson,
  types: ["AnimoOpenId4VcPlayground"],
  cryptographic_binding_methods_supported: ["did:key", "did:jwk"],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.EdDSA],
  display: [
    {
      name: "Animo OpenID4VC Playground - JWT VC",
      description: "Issued using Animo's OpenID4VC Playground",
      background_color: "#FFFFFF",
      locale: "en",
      text_color: "#E17471", // animo red (make animo blue?)
    },
  ],
} as const satisfies OpenId4VciCredentialSupportedWithId;

export const animoOpenId4VcPlaygroundCredentialLdpVc = {
  id: "AnimoOpenId4VcPlaygroundLdpVc",
  format: OpenId4VciCredentialFormatProfile.LdpVc,
  types: ["AnimoOpenId4VcPlayground"],
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  cryptographic_binding_methods_supported: ["did:key", "did:jwk"],
  cryptographic_suites_supported: [
    JwaSignatureAlgorithm.EdDSA,
    // TODO: is it needed that proof type is added here?
    // According to spec yes, but it's only used for the request proof,
    // which is a jwt/cwt (so alg)
    "Ed25519Signature2018",
  ],
  display: [
    {
      name: "Animo OpenID4VC Playground - LDP VC",
      description: "Issued using Animo's OpenID4VC Playground",
      background_color: "#FFFFFF",
      locale: "en",
      text_color: "#E17471", // animo red (make animo blue?)
    },
  ],
} as const satisfies OpenId4VciCredentialSupportedWithId;

export const credentialsSupported = [
  animoOpenId4VcPlaygroundCredentialSdJwtVcDid,
  animoOpenId4VcPlaygroundCredentialSdJwtVcJwk,
  animoOpenId4VcPlaygroundCredentialJwtVc,
  // Not really working yet
  // animoOpenId4VcPlaygroundCredentialLdpVc,
] as const satisfies OpenId4VciCredentialSupportedWithId[];
type CredentialSupportedId = (typeof credentialsSupported)[number]["id"];
export const credentialSupportedIds = credentialsSupported.map((s) => s.id) as [
  CredentialSupportedId,
  ...CredentialSupportedId[]
];
