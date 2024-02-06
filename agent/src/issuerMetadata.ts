import { JwaSignatureAlgorithm } from "@credo-ts/core";
import {
  OpenId4VciCredentialSupportedWithId,
  OpenId4VciCredentialFormatProfile,
  OpenId4VciIssuerMetadataDisplay,
} from "@credo-ts/openid4vc";

const ANIMO_BLUE = "#5e7db6";
const ANIMO_RED = "#E17471";
const ANIMO_DARK_BACKGROUND = "#202223";
const WHITE = "#FFFFFF";

export const issuerDisplay = [
  {
    background_color: ANIMO_DARK_BACKGROUND,
    name: "Animo OpenID4VC Playground",
    locale: "en",
    logo: {
      alt_text: "Animo logo",
      url: "https://i.imgur.com/PUAIUed.jpeg",
    },
    text_color: WHITE,
  },
] satisfies OpenId4VciIssuerMetadataDisplay[];

export const animoOpenId4VcPlaygroundCredentialSdJwtVcDid = {
  id: "AnimoOpenId4VcPlaygroundSdJwtVcDid",
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  vct: "AnimoOpenId4VcPlayground",
  cryptographic_binding_methods_supported: ["did:key", "did:jwk"],
  cryptographic_suites_supported: [
    JwaSignatureAlgorithm.EdDSA,
    JwaSignatureAlgorithm.ES256,
  ],
  display: [
    {
      name: "SD-JWT-VC",
      description: "DID holder binding",
      background_color: ANIMO_DARK_BACKGROUND,
      locale: "en",
      text_color: WHITE,
    },
  ],
} as const satisfies OpenId4VciCredentialSupportedWithId;

export const animoOpenId4VcPlaygroundCredentialSdJwtVcJwk = {
  id: "AnimoOpenId4VcPlaygroundSdJwtVcJwk",
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  vct: "AnimoOpenId4VcPlayground",
  cryptographic_binding_methods_supported: ["jwk"],
  cryptographic_suites_supported: [
    JwaSignatureAlgorithm.EdDSA,
    JwaSignatureAlgorithm.ES256,
  ],
  display: [
    {
      name: "SD-JWT-VC",
      description: "JWK holder binding",
      background_color: ANIMO_DARK_BACKGROUND,
      locale: "en",
      text_color: WHITE,
    },
  ],
} as const satisfies OpenId4VciCredentialSupportedWithId;

export const animoOpenId4VcPlaygroundCredentialJwtVc = {
  id: "AnimoOpenId4VcPlaygroundJwtVc",
  format: OpenId4VciCredentialFormatProfile.JwtVcJson,
  types: ["AnimoOpenId4VcPlayground"],
  cryptographic_binding_methods_supported: ["did:key", "did:jwk"],
  cryptographic_suites_supported: [
    JwaSignatureAlgorithm.EdDSA,
    JwaSignatureAlgorithm.ES256,
  ],
  display: [
    {
      name: "JWT VC",
      background_color: ANIMO_DARK_BACKGROUND,
      locale: "en",
      text_color: WHITE,
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
      name: "LDP VC",
      background_color: ANIMO_DARK_BACKGROUND,
      locale: "en",
      text_color: WHITE,
    },
  ],
} as const satisfies OpenId4VciCredentialSupportedWithId;

export const credentialsSupported = [
  animoOpenId4VcPlaygroundCredentialSdJwtVcDid,
  animoOpenId4VcPlaygroundCredentialSdJwtVcJwk,
  animoOpenId4VcPlaygroundCredentialJwtVc,
  // Not really working yet
  // FIXME: Ed25519Signature2018 required ed25519 context url
  // but that is bullshit, as you can just use another verification
  // method to issue/verify such as JsonWebKey or MultiKey
  // animoOpenId4VcPlaygroundCredentialLdpVc,
] as const satisfies OpenId4VciCredentialSupportedWithId[];
type CredentialSupportedId = (typeof credentialsSupported)[number]["id"];
export const credentialSupportedIds = credentialsSupported.map((s) => s.id) as [
  CredentialSupportedId,
  ...CredentialSupportedId[]
];
