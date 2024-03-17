import { agent } from "./agent";
import express, { NextFunction, Request, Response } from "express";
import z from "zod";
import { credentialSupportedIds } from "./issuerMetadata";
import { getIssuer } from "./issuer";
import {
  DifPresentationExchangeService,
  JsonTransformer,
  KeyDidCreateOptions,
  KeyType,
  RecordNotFoundError,
  W3cJsonLdVerifiableCredential,
  W3cJsonLdVerifiablePresentation,
  W3cJwtVerifiableCredential,
  W3cJwtVerifiablePresentation,
  getJwkFromKey,
  getKeyFromVerificationMethod,
  parseDid,
} from "@credo-ts/core";
import { getAvailableDids, getWebDidDocument } from "./did";
import { getVerifier } from "./verifier";
import { OpenId4VcIssuanceSessionRepository } from "@credo-ts/openid4vc/build/openid4vc-issuer/repository";
import { OfferSessionMetadata } from "./session";
import { OpenId4VcVerificationSessionState } from "@credo-ts/openid4vc";

const zCreateOfferRequest = z.object({
  // FIXME: rename offeredCredentials to credentialSupportedIds in AFJ
  credentialSupportedIds: z.array(z.enum(credentialSupportedIds)),
  issuerDidMethod: z.string(),
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
    });

    // FIXME: in 0.5.1 we can pass the issuanceMetadata to the createCredentialOffer method
    // directly
    const issuanceSessionRepository = agent.dependencyManager.resolve(
      OpenId4VcIssuanceSessionRepository
    );
    offer.issuanceSession.issuanceMetadata = {
      issuerDidMethod: createOfferRequest.issuerDidMethod,
    } satisfies OfferSessionMetadata;
    await issuanceSessionRepository.update(
      agent.context,
      offer.issuanceSession
    );

    return response.json(offer);
  }
);

apiRouter.get("/issuer", async (_, response: Response) => {
  const issuer = await getIssuer();
  const availableDids = getAvailableDids();

  return response.json({
    credentialsSupported: issuer.credentialsSupported,
    display: issuer.display,
    availableDidMethods: Array.from(
      new Set(availableDids.map((did) => `did:${parseDid(did).method}`))
    ),
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
            }

            if (supportsJwk) {
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
        }

        if (credential instanceof W3cJwtVerifiableCredential) {
          return {
            pretty: JsonTransformer.toJSON(credential.credential),
            encoded: credential.serializedJwt,
          };
        }

        return {
          pretty: {
            ...credential,
            compact: undefined,
          },
          encoded: credential.compact,
        };
      }),
    });
  }
);

const zCreatePresentationRequestBody = z.object({
  presentationDefinition: z.record(z.string(), z.any()),
});

apiRouter.post(
  "/requests/create",
  async (request: Request, response: Response) => {
    const verifier = await getVerifier();

    // FIXME: somehow JSON doesn't work
    const createPresentationRequestBody = zCreatePresentationRequestBody.parse(
      typeof request.body === "string" ? JSON.parse(request.body) : request.body
    );

    // DIIPv1 uses ES256/P256 keys so we use that to create the request
    const webDid = await getWebDidDocument();
    const verificationMethods = webDid.verificationMethod ?? [];
    const keys = verificationMethods.map((v) =>
      getKeyFromVerificationMethod(v)
    );
    const verificationMethodIndex = keys.findIndex(
      (k) => k.keyType === KeyType.P256
    );

    if (verificationMethodIndex === -1) {
      return response.status(500).json({
        error: "No P-256 verification method found",
      });
    }

    const { authorizationRequest, verificationSession } =
      await agent.modules.openId4VcVerifier.createAuthorizationRequest({
        verifierId: verifier.verifierId,
        requestSigner: {
          didUrl: verificationMethods[verificationMethodIndex].id,
          method: "did",
        },
        presentationExchange: {
          definition:
            createPresentationRequestBody.presentationDefinition as any,
        },
      });

    return response.json({
      authorizationRequestUri: authorizationRequest,
      verificationSessionId: verificationSession.id,
    });
  }
);

const zReceivePresentationRequestBody = z.object({
  authorizationRequestUri: z.string().url(),
});

apiRouter.get("/requests/:verificationSessionId", async (request, response) => {
  const verificationSessionId = request.params.verificationSessionId;

  try {
    const verificationSession =
      await agent.modules.openId4VcVerifier.getVerificationSessionById(
        verificationSessionId
      );

    if (
      verificationSession.state ===
      OpenId4VcVerificationSessionState.ResponseVerified
    ) {
      const verified =
        await agent.modules.openId4VcVerifier.getVerifiedAuthorizationResponse(
          verificationSessionId
        );

      return response.json({
        verificationSessionId: verificationSession.id,
        responseStatus: verificationSession.state,
        error: verificationSession.errorMessage,

        presentations: verified.presentationExchange?.presentations.map(
          (presentation) => {
            if (presentation instanceof W3cJsonLdVerifiablePresentation) {
              return {
                pretty: presentation.toJson(),
                encoded: presentation.toJson(),
              };
            }

            if (presentation instanceof W3cJwtVerifiablePresentation) {
              return {
                pretty: JsonTransformer.toJSON(presentation.presentation),
                encoded: presentation.serializedJwt,
              };
            }

            return {
              pretty: {
                ...presentation,
                compact: undefined,
              },
              encoded: presentation.compact,
            };
          }
        ),
        submission: verified.presentationExchange?.submission,
        definition: verified.presentationExchange?.definition,
      });
    }

    return response.json({
      verificationSessionId: verificationSession.id,
      responseStatus: verificationSession.state,
      error: verificationSession.errorMessage,
    });
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      return response.status(404).send("Verification session not found");
    }
  }
});

apiRouter.post(
  "/requests/receive",
  async (request: Request, response: Response) => {
    const receivePresentationRequestBody =
      zReceivePresentationRequestBody.parse(
        typeof request.body === "string"
          ? JSON.parse(request.body)
          : request.body
      );

    const resolved =
      await agent.modules.openId4VcHolder.resolveSiopAuthorizationRequest(
        receivePresentationRequestBody.authorizationRequestUri
      );

    if (!resolved.presentationExchange) {
      return response.status(500).json({
        error:
          "Expected presentation_definition to be included in authorization request",
      });
    }

    // FIXME: expose PresentationExchange API (or allow auto-select in another way)
    const presentationExchangeService = agent.dependencyManager.resolve(
      DifPresentationExchangeService
    );

    const selectedCredentials =
      presentationExchangeService.selectCredentialsForRequest(
        resolved.presentationExchange?.credentialsForRequest
      );

    const { submittedResponse, serverResponse } =
      await agent.modules.openId4VcHolder.acceptSiopAuthorizationRequest({
        authorizationRequest: resolved.authorizationRequest,
        presentationExchange: {
          credentials: selectedCredentials,
        },
      });

    return response.status(serverResponse.status).json(submittedResponse);
  }
);

apiRouter.use(
  (error: Error, request: Request, response: Response, next: NextFunction) => {
    console.error("Unhandled error", error);
    return response.status(500).json({
      error: error.message,
    });
  }
);
