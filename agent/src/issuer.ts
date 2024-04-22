import { OpenId4VciCredentialRequestToCredentialMapper } from "@credo-ts/openid4vc";
import {
  W3cCredential,
  parseDid,
  KeyType,
  getKeyFromVerificationMethod,
} from "@credo-ts/core";
import { agent } from "./agent";
import {
  animoOpenId4VcPlaygroundCredentialJwtVc,
  animoOpenId4VcPlaygroundCredentialLdpVc,
  animoOpenId4VcPlaygroundCredentialSdJwtVcDid,
  animoOpenId4VcPlaygroundCredentialSdJwtVcJwk,
  credentialsSupported,
  issuerDisplay,
} from "./issuerMetadata";
import { OfferSessionMetadata } from "./session";
import { getAvailableDids } from "./did";
import { OpenId4VcIssuanceSessionRepository } from "@credo-ts/openid4vc/build/openid4vc-issuer/repository";

const issuerId = "e451c49f-1186-4fe4-816d-a942151dfd59";

export async function createIssuer() {
  return agent.modules.openId4VcIssuer.createIssuer({
    issuerId,
    credentialsSupported,
    display: issuerDisplay,
  });
}

export async function doesIssuerExist() {
  try {
    await agent.modules.openId4VcIssuer.getByIssuerId(issuerId);
    return true;
  } catch (error) {
    return false;
  }
}

export async function getIssuer() {
  return agent.modules.openId4VcIssuer.getByIssuerId(issuerId);
}

export async function updateIssuer() {
  await agent.modules.openId4VcIssuer.updateIssuerMetadata({
    issuerId,
    credentialsSupported,
    display: issuerDisplay,
  });
}

export const credentialRequestToCredentialMapper: OpenId4VciCredentialRequestToCredentialMapper =
  async ({
    credentialsSupported,
    credentialRequest,
    issuanceSession,
    // FIXME: it would be useful if holderBinding would include some metadata on the key type / alg used
    // for the key binding
    holderBinding,
  }) => {
    const credentialSupported = credentialsSupported[0];

    // not sure if this check is needed anymore
    if (!issuanceSession) throw new Error("Issuance session not found");
    if (!issuanceSession.issuanceMetadata)
      throw new Error("No issuance metadata");

    const { issuerDidMethod } =
      issuanceSession.issuanceMetadata as unknown as OfferSessionMetadata;

    const possibleDids = getAvailableDids().filter((d) =>
      d.startsWith(issuerDidMethod)
    );

    let holderKeyType: KeyType;
    if (holderBinding.method === "jwk") {
      holderKeyType = holderBinding.jwk.keyType;
    } else {
      const holderDidDocument = await agent.dids.resolveDidDocument(
        holderBinding.didUrl
      );
      const verificationMethod = holderDidDocument.dereferenceKey(
        holderBinding.didUrl
      );
      holderKeyType = getKeyFromVerificationMethod(verificationMethod).keyType;
    }

    if (possibleDids.length === 0) {
      throw new Error("No available DIDs for the issuer method");
    }

    let issuerDidUrl: string | undefined = undefined;

    for (const possibleDid of possibleDids) {
      const didDocument = await agent.dids.resolveDidDocument(possibleDid);
      // Set the first verificationMethod as backup, in case we won't find a match
      if (!issuerDidUrl && didDocument.verificationMethod?.[0].id) {
        issuerDidUrl = didDocument.verificationMethod?.[0].id;
      }

      const matchingVerificationMethod = didDocument.assertionMethod?.find(
        (assertionMethod) => {
          const verificationMethod =
            typeof assertionMethod === "string"
              ? didDocument.dereferenceVerificationMethod(assertionMethod)
              : assertionMethod;
          const keyType =
            getKeyFromVerificationMethod(verificationMethod).keyType;
          return keyType === holderKeyType;
        }
      );

      if (matchingVerificationMethod) {
        issuerDidUrl =
          typeof matchingVerificationMethod === "string"
            ? matchingVerificationMethod
            : matchingVerificationMethod.id;
        break;
      }
    }

    if (!issuerDidUrl) {
      throw new Error("No matching verification method found");
    }

    if (
      credentialSupported.format === "vc+sd-jwt" &&
      (credentialSupported.id ===
        animoOpenId4VcPlaygroundCredentialSdJwtVcDid.id ||
        credentialSupported.id ===
          animoOpenId4VcPlaygroundCredentialSdJwtVcJwk.id)
    ) {
      return {
        format: "vc+sd-jwt",
        holder: holderBinding,
        payload: {
          vct: credentialSupported.vct,

          playground: {
            framework: "Aries Framework JavaScript",
            language: "TypeScript",
            version: "1.0",
            createdBy: "Animo Solutions",
          },
        },
        issuer: {
          didUrl: issuerDidUrl,
          method: "did",
        },
        disclosureFrame: {
          playground: {
            language: true,
            version: true,
          },
        } as any,
      };
    }

    if (
      (credentialSupported.format === "jwt_vc_json" &&
        credentialSupported.id ===
          animoOpenId4VcPlaygroundCredentialJwtVc.id) ||
      (credentialSupported.format === "ldp_vc" &&
        credentialSupported.id === animoOpenId4VcPlaygroundCredentialLdpVc.id)
    ) {
      if (holderBinding.method !== "did") {
        throw new Error("Only did holder binding supported for JWT VC");
      }
      return {
        format:
          credentialSupported.format === "jwt_vc_json" ? "jwt_vc" : "ldp_vc",
        verificationMethod: issuerDidUrl,
        credential: W3cCredential.fromJson({
          // FIXME: we need to include/cache default contexts in AFJ
          // It quite slow the first time now
          // And not secure
          "@context":
            credentialSupported.format === "ldp_vc"
              ? [
                  "https://www.w3.org/2018/credentials/v1",
                  // Fields must be defined for JSON-LD
                  {
                    "@vocab":
                      "https://www.w3.org/ns/credentials/issuer-dependent#",
                  },
                ]
              : ["https://www.w3.org/2018/credentials/v1"],
          // TODO: should 'VerifiableCredential' be in the issuer metadata type?
          // FIXME: jwt verification did not fail when this was array within array
          // W3cCredential is not validated in AFJ???
          type: ["VerifiableCredential", ...credentialSupported.types],
          issuanceDate: new Date().toISOString(),
          issuer: parseDid(issuerDidUrl).did,
          credentialSubject: {
            id: parseDid(holderBinding.didUrl).did,
            playground: {
              framework: "Aries Framework JavaScript",
              language: "TypeScript",
              version: "1.0",
              createdBy: "Animo Solutions",
            },
          },
        }),
      };
    }

    throw new Error(`Unsupported credential ${credentialSupported.id}`);
  };
