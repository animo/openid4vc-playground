import { JwaSignatureAlgorithm } from "@credo-ts/core";
import {
  OpenId4VciCredentialFormatProfile,
  type OpenId4VciCredentialSupportedWithId,
  type OpenId4VciIssuerMetadataDisplay,
} from "@credo-ts/openid4vc";

const ANIMO_DARK_BACKGROUND = "#202223";
const WHITE = "#FFFFFF";

export const issuerDisplay = [
  {
    background_color: ANIMO_DARK_BACKGROUND,
    name: "Animo + Funke OpenID4VC Playground",
    locale: "en",
    logo: {
      alt_text: "Animo logo",
      url: "https://i.imgur.com/PUAIUed.jpeg",
    },
    text_color: WHITE,
  },
] satisfies OpenId4VciIssuerMetadataDisplay[];

export const mockIdenticonAttendeeSdJwt = {
  format: "vc+sd-jwt",
  id: "mockIdenticonAttendeeSdJwt",
  vct: "https://funke.animo.id/IdenticonAttendee",
  cryptographic_binding_methods_supported: ["jwk"],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [JwaSignatureAlgorithm.ES256],
    },
  },
  display: [
    {
      name: "Identicon Attendee",
      background_image: {
        url: "https://i.imgur.com/uiczYkL.png",
        uri: "https://i.imgur.com/uiczYkL.png",
      },
      text_color: WHITE,
    },
  ],
} as const satisfies OpenId4VciCredentialSupportedWithId;

export const mockEmployeeBadgeMdoc = {
  format: "mso_mdoc",
  doctype: "id.animo.employeebadge",
  id: "mockEmployeeBadgeMdoc",
  cryptographic_binding_methods_supported: ["cose_key"],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [JwaSignatureAlgorithm.ES256],
    },
  },
  display: [
    {
      name: "Animo Employee Badge",
      background_color: ANIMO_DARK_BACKGROUND,
      text_color: WHITE,
    },
  ],
} as const satisfies OpenId4VciCredentialSupportedWithId;

export const mockPidOpenId4VcPlaygroundCredentialSdJwtVcJwk = {
  id: "mockPidOpenId4VcPlaygroundSdJwtVcJwk",
  format: OpenId4VciCredentialFormatProfile.SdJwtVc,
  vct: "https://example.bmi.bund.de/credential/pid/1.0",
  cryptographic_binding_methods_supported: ["jwk"],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  display: [
    {
      name: "PID",
      description: "Mock PID issued by Animo",
      background_color: ANIMO_DARK_BACKGROUND,
      locale: "en",
      text_color: WHITE,
    },
  ],
} as const satisfies OpenId4VciCredentialSupportedWithId;

export const mockPidOpenId4VcPlaygroundCredentialMsoMdocJwk = {
  id: "mockPidOpenId4VcPlaygroundMsoMdocJwk",
  format: OpenId4VciCredentialFormatProfile.MsoMdoc,
  doctype: "eu.europa.ec.eudi.pid.1",
  cryptographic_binding_methods_supported: ["jwk"],
  cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  display: [
    {
      name: "PID",
      description: "Mock PID issued by Animo",
      background_color: ANIMO_DARK_BACKGROUND,
      locale: "en",
      text_color: WHITE,
    },
  ],
} as const satisfies OpenId4VciCredentialSupportedWithId;

export const credentialsSupported = [
  mockEmployeeBadgeMdoc,
  mockIdenticonAttendeeSdJwt
] as const satisfies OpenId4VciCredentialSupportedWithId[];

type CredentialSupportedId = (typeof credentialsSupported)[number]["id"];
export const credentialSupportedIds = credentialsSupported.map((s) => s.id) as [
  CredentialSupportedId,
  ...CredentialSupportedId[]
];
