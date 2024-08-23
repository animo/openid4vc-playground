import {
  Agent,
  ConsoleLogger,
  DidsModule,
  JwkDidRegistrar,
  JwkDidResolver,
  KeyDidRegistrar,
  KeyDidResolver,
  LogLevel,
  WebDidResolver,
  joinUriParts,
} from "@credo-ts/core";
import { agentDependencies } from "@credo-ts/node";
import { AskarModule } from "@credo-ts/askar";
import {
  CheqdModule,
  CheqdDidRegistrar,
  CheqdDidResolver,
} from "@credo-ts/cheqd";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import {
  OpenId4VcHolderModule,
  OpenId4VcIssuerModule,
  OpenId4VcVerifierModule,
} from "@credo-ts/openid4vc";
import {
  AGENT_HOST,
  AGENT_WALLET_KEY,
  CHEQD_TESTNET_COSMOS_PAYER_SEED,
} from "./constants";
import { Router } from "express";
import { credentialRequestToCredentialMapper } from "./issuer";

process.on("unhandledRejection", (reason) => {
  console.log("Unhandled rejection", reason);
});

export const openId4VciRouter = Router();
export const openId4VpRouter = Router();

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
    cheqd: new CheqdModule({
      networks: [
        {
          network: "testnet",
          cosmosPayerSeed: CHEQD_TESTNET_COSMOS_PAYER_SEED,
        },
      ],
    }),
    dids: new DidsModule({
      resolvers: [
        new KeyDidResolver(),
        new JwkDidResolver(),
        new WebDidResolver(),
        new CheqdDidResolver(),
      ],
      registrars: [
        new KeyDidRegistrar(),
        new JwkDidRegistrar(),
        new CheqdDidRegistrar(),
      ],
    }),
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
    openId4VcVerifier: new OpenId4VcVerifierModule({
      baseUrl: joinUriParts(AGENT_HOST, ["siop"]),
      router: openId4VpRouter,
    }),
  },
});
