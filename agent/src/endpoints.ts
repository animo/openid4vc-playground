import { agent } from "./agent";
import express, { Request, Response } from "express";
import z from "zod";
import { credentialSupportedIds } from "./issuerMetadata";
import { getIssuer } from "./issuer";
import {
  JsonTransformer,
  KeyDidCreateOptions,
  W3cJsonLdVerifiableCredential,
  W3cJwtVerifiableCredential,
  getJwkFromKey,
} from "@aries-framework/core";
import { getAvailableDids } from "./did";
import { setOfferSessionMetadata } from "./session";

const zCreateOfferRequest = z.object({
  // FIXME: rename offeredCredentials to credentialSupportedIds in AFJ
  credentialSupportedIds: z.array(z.enum(credentialSupportedIds)),
  issuerDid: z.string(),
});

export const apiRouter = express.Router();
apiRouter.use(express.json());
apiRouter.use(express.text());
apiRouter.post(
  "/offers/create",
  async (request: Request, response: Response) => {
    const issuer = await getIssuer();
    // FIXME: somehow JSON doesn't work
    const createOfferRequest = zCreateOfferRequest.parse(
      typeof request.body === "string" ? JSON.parse(request.body) : request.body
    );

    const offer = await agent.modules.openId4VcIssuer.createCredentialOffer({
      issuerId: issuer.issuerId,
      offeredCredentials: createOfferRequest.credentialSupportedIds,
      preAuthorizedCodeFlowConfig: {
        userPinRequired: false,
      },
      // FIXME: scheme should default to openid-credential-offer
      // and otherwise be inferred by default in AFJ
      scheme: "openid-credential-offer",
    });

    await setOfferSessionMetadata(offer.credentialOfferPayload, {
      issuerDid: createOfferRequest.issuerDid,
    });

    return response.json(offer);
  }
);

apiRouter.get("/issuer", async (_, response: Response) => {
  const issuer = await getIssuer();
  const availableDids = getAvailableDids();

  return response.json({
    credentialsSupported: issuer.credentialsSupported,
    display: issuer.display,
    availableDids,
  });
});

const zReceiveOfferRequest = z.object({
  credentialOfferUri: z.string().url(),
});

apiRouter.post(
  "/offers/receive",
  async (request: Request, response: Response) => {
    const receiveOfferRequest = zReceiveOfferRequest.parse(
      typeof request.body === "string" ? JSON.parse(request.body) : request.body
    );

    const resolvedOffer =
      await agent.modules.openId4VcHolder.resolveCredentialOffer(
        receiveOfferRequest.credentialOfferUri
      );
    const credentials =
      await agent.modules.openId4VcHolder.acceptCredentialOfferUsingPreAuthorizedCode(
        resolvedOffer,
        {
          verifyCredentialStatus: false,
          credentialBindingResolver: async ({
            keyType,
            supportsJwk,
            supportedDidMethods,
          }) => {
            if (supportedDidMethods?.includes("did:key")) {
              const didKeyResult = await agent.dids.create<KeyDidCreateOptions>(
                {
                  method: "key",
                  options: {
                    keyType,
                  },
                }
              );

              if (didKeyResult.didState.state !== "finished") {
                throw new Error("did creation failed");
              }
              const firstVerificationMethod =
                didKeyResult.didState.didDocument.verificationMethod?.[0];
              if (!firstVerificationMethod) {
                throw new Error("did document has no verification method");
              }

              return {
                method: "did",
                didUrl: firstVerificationMethod.id,
              };
            } else if (supportsJwk) {
              const key = await agent.wallet.createKey({
                keyType,
              });

              return {
                method: "jwk",
                jwk: getJwkFromKey(key),
              };
            }

            throw new Error(
              "only did:key and jwk are supported for holder binding"
            );
          },
        }
      );

    return response.json({
      credentials: credentials.map((credential) => {
        if (credential instanceof W3cJsonLdVerifiableCredential) {
          return {
            pretty: credential.toJson(),
            encoded: credential.toJson(),
          };
        } else if (credential instanceof W3cJwtVerifiableCredential) {
          return {
            pretty: JsonTransformer.toJSON(credential.credential),
            encoded: credential.serializedJwt,
          };
        } else {
          return {
            pretty: {
              ...credential,
              compact: undefined,
            },
            encoded: credential.compact,
          };
        }
      }),
    });
  }
);
