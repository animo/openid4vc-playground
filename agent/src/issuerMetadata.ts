import { JwaSignatureAlgorithm } from "@aries-framework/core";
import {
  OpenId4VciCredentialSupportedWithId,
  OpenIdCredentialFormatProfile,
} from "@aries-framework/openid4vc";

// FIXME: type needs to be exported from AFJ
export const issuerDisplay = [
  {
    background_color: "FFFFFF",
    description: "Animo OpenID4VC Playground",
    name: "Animo OpenID4VC Playground",
    locale: "en",
    logo: {
      alt_text: "Animo logo",
      url: "https://camo.githubusercontent.com/8a4c8a2f9d6269647fe49dffcd42d4221d5251a25461331648d42110f667e749/68747470733a2f2f7265732e636c6f7564696e6172792e636f6d2f616e696d6f2d736f6c7574696f6e732f696d6167652f75706c6f61642f76313635363537383332302f616e696d6f2d6c6f676f2d6c696768742d6e6f2d746578745f6f6b396175792e737667",
    },
    text_color: "E17471", // animo red
  },
];

export const animoOpenId4VcPlaygroundCredentialSdJwtVcDid = {
  id: "AnimoOpenId4VcPlaygroundSdJwtVcDid",
  format: OpenIdCredentialFormatProfile.SdJwtVc,
  vct: "AnimoOpenId4VcPlayground",
  cryptographic_binding_methods_supported: ["did:key", "did:jwk"],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.EdDSA],
  display: [
    {
      name: "Animo OpenID4VC Playground - SD-JWT-VC (did holder binding)",
      description: "Issued using Animo's OpenID4VC Playground",
      background_color: "#FFFFFF",
      locale: "en",
      text_color: "E17471", // animo red (make animo blue?)
    },
  ],
} as const satisfies OpenId4VciCredentialSupportedWithId;

export const animoOpenId4VcPlaygroundCredentialSdJwtVcJwk = {
  id: "AnimoOpenId4VcPlaygroundSdJwtVcJwk",
  format: OpenIdCredentialFormatProfile.SdJwtVc,
  vct: "AnimoOpenId4VcPlayground",
  cryptographic_binding_methods_supported: ["jwk"],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.EdDSA],
  display: [
    {
      name: "Animo OpenID4VC Playground - SD-JWT-VC (jwk holder binding)",
      description: "Issued using Animo's OpenID4VC Playground",
      background_color: "#FFFFFF",
      locale: "en",
      text_color: "E17471", // animo red (make animo blue?)
    },
  ],
} as const satisfies OpenId4VciCredentialSupportedWithId;

export const animoOpenId4VcPlaygroundCredentialJwtVc = {
  id: "AnimoOpenId4VcPlayground",
  format: OpenIdCredentialFormatProfile.JwtVcJson,
  types: ["AnimoOpenId4VcPlayground"],
  cryptographic_binding_methods_supported: ["did:key", "did:jwk"],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.EdDSA],
  display: [
    {
      name: "Animo OpenID4VC Playground - JWT VC",
      description: "Issued using Animo's OpenID4VC Playground",
      background_color: "#FFFFFF",
      locale: "en",
      text_color: "E17471", // animo red (make animo blue?)
    },
  ],
} as const satisfies OpenId4VciCredentialSupportedWithId;

export const credentialsSupported = [
  animoOpenId4VcPlaygroundCredentialSdJwtVcDid,
  animoOpenId4VcPlaygroundCredentialSdJwtVcJwk,
  animoOpenId4VcPlaygroundCredentialJwtVc,
] as const satisfies OpenId4VciCredentialSupportedWithId[];
type CredentialSupportedId = (typeof credentialsSupported)[number]["id"];
export const credentialSupportedIds = credentialsSupported.map((s) => s.id) as [
  CredentialSupportedId,
  ...CredentialSupportedId[]
];
