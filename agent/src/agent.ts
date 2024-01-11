import {
  Agent,
  ConsoleLogger,
  LogLevel,
  joinUriParts,
} from "@aries-framework/core";
import { agentDependencies } from "@aries-framework/node";
import { SdJwtVcModule } from "@aries-framework/sd-jwt-vc";
import { AskarModule } from "@aries-framework/askar";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import {
  OpenId4VcHolderModule,
  OpenId4VcIssuerModule,
} from "@aries-framework/openid4vc";
import { AGENT_HOST, AGENT_WALLET_KEY } from "./constants";
import { Router } from "express";
import { credentialRequestToCredentialMapper } from "./issuer";

export const openId4VciRouter = Router();

export const agent = new Agent({
  dependencies: agentDependencies,
  config: {
    label: "OpenID4VC Playground",
    logger: new ConsoleLogger(LogLevel.trace),
    // TODO: add postgres storage
    walletConfig: {
      id: "openid4vc-playground",
      key: AGENT_WALLET_KEY,
    },
  },
  modules: {
    sdJwtVc: new SdJwtVcModule(),
    askar: new AskarModule({
      ariesAskar,
    }),
    openId4VcIssuer: new OpenId4VcIssuerModule({
      baseUrl: joinUriParts(AGENT_HOST, ["oid4vci"]),
      router: openId4VciRouter,
      endpoints: {
        credential: {
          credentialRequestToCredentialMapper,
        },
      },
    }),
    openId4VcHolder: new OpenId4VcHolderModule(),
  },
});
