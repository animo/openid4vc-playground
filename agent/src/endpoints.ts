import { agent } from "./agent";
import express, { NextFunction, Request, Response } from "express";
import z from "zod";
import { credentialSupportedIds } from "./issuerMetadata";
import { getIssuer } from "./issuer";
import {
  DifPresentationExchangeService,
  JsonEncoder,
  JsonTransformer,
  KeyDidCreateOptions,
  W3cJsonLdVerifiableCredential,
  W3cJsonLdVerifiablePresentation,
  W3cJwtVerifiableCredential,
  W3cJwtVerifiablePresentation,
  getJwkFromKey,
  parseDid,
} from "@credo-ts/core";
import { getAvailableDids, getWebDidDocument } from "./did";
import { setOfferSessionMetadata } from "./session";
import { getVerifier } from "./verifier";
import { getVerifiablePresentationFromEncoded } from "@credo-ts/core/build/modules/dif-presentation-exchange/utils/transform";

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

    await setOfferSessionMetadata(offer.credentialOfferPayload, {
      issuerDidMethod: createOfferRequest.issuerDidMethod,
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
    const webDid = await getWebDidDocument();

    const { authorizationRequestUri, authorizationRequestPayload } =
      await agent.modules.openId4VcVerifier.createAuthorizationRequest({
        verifierId: verifier.verifierId,
        requestSigner: {
          didUrl: webDid.verificationMethod?.[0].id as string,
          method: "did",
        },
        presentationExchange: {
          definition:
            createPresentationRequestBody.presentationDefinition as any,
        },
      });

    // FIXME: return correlationId in AFJ
    const nonce = JsonEncoder.fromBase64(
      authorizationRequestPayload.request?.split(".")[1] as string
    ).nonce;
    const requestState = await agent.modules.openId4VcVerifier.config
      .getSessionManager(agent.context)
      .getRequestStateByNonce(nonce);

    if (!requestState) {
      return response.status(500).json({
        error: "Request state not found",
      });
    }

    return response.json({
      authorizationRequestUri,
      requestId: requestState.correlationId,
    });
  }
);

const zReceivePresentationRequestBody = z.object({
  authorizationRequestUri: z.string().url(),
});

apiRouter.get("/requests/:requestId", async (request, response) => {
  const requestId = request.params.requestId;
  const responseState = await agent.modules.openId4VcVerifier.config
    .getSessionManager(agent.context)
    .getResponseStateByCorrelationId(requestId);
  const requestState = await agent.modules.openId4VcVerifier.config
    .getSessionManager(agent.context)
    .getRequestStateByCorrelationId(requestId);

  if (!requestState) {
    return response
      .status(404)
      .json({ error: `Request with id ${requestId} not found` });
  }

  // FIXME: if we use request_uri we can know when it's scanned and then update the state to
  // 'fetched' or something so we can show a loading indicator
  if (!responseState) {
    return response.json({
      requestId,
      responseStatus: "pending",
    });
  }

  // FIXME: when we get the state in AFJ we should be able to get the presentations and submission back
  const presentations: any[] = Array.isArray(
    responseState.response.payload.vp_token
  )
    ? responseState.response.payload.vp_token
    : [responseState.response.payload.vp_token];

  return response.json({
    requestId,
    responseStatus: responseState.status,
    error: responseState.error?.message,
    presentations: presentations.map((presentation) => {
      const presentationInstance = getVerifiablePresentationFromEncoded(
        agent.context,
        presentation
      );
      if (presentationInstance instanceof W3cJsonLdVerifiablePresentation) {
        return {
          pretty: presentationInstance.toJson(),
          encoded: presentationInstance.toJson(),
        };
      }

      if (presentationInstance instanceof W3cJwtVerifiablePresentation) {
        return {
          pretty: JsonTransformer.toJSON(presentationInstance.presentation),
          encoded: presentationInstance.serializedJwt,
        };
      }

      return {
        pretty: {
          ...presentationInstance,
          compact: undefined,
        },
        encoded: presentationInstance.compact,
      };
    }),
    submission: responseState.response.payload.presentation_submission,
    definition: (await requestState.request.getPresentationDefinitions())?.[0]
      .definition,
  });
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
