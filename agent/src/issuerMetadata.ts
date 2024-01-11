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

export const animoOpenId4VcPlaygroundCredential = {
  id: "AnimoOpenId4VcPlayground",
  format: OpenIdCredentialFormatProfile.SdJwtVc,
  vct: "AnimoOpenId4VcPlayground",
  cryptographic_binding_methods_supported: ["jwk", "did:key"],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.EdDSA],
} as const satisfies OpenId4VciCredentialSupportedWithId;

export const credentialsSupported = [
  animoOpenId4VcPlaygroundCredential,
] as const satisfies OpenId4VciCredentialSupportedWithId[];
type CredentialSupportedId = (typeof credentialsSupported)[number]["id"];
export const credentialSupportedIds = credentialsSupported.map((s) => s.id) as [
  CredentialSupportedId,
  ...CredentialSupportedId[]
];
