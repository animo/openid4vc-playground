import { CredentialRequestToCredentialMapper } from "@aries-framework/openid4vc";
import { W3cCredential, parseDid } from "@aries-framework/core";
import { agent } from "./agent";
import {
  animoOpenId4VcPlaygroundCredentialJwtVc,
  animoOpenId4VcPlaygroundCredentialLdpVc,
  animoOpenId4VcPlaygroundCredentialSdJwtVcDid,
  animoOpenId4VcPlaygroundCredentialSdJwtVcJwk,
  credentialsSupported,
  issuerDisplay,
} from "./issuerMetadata";
import { getOfferSessionMetadata } from "./session";

export async function createIssuer() {
  return agent.modules.openId4VcIssuer.createIssuer({
    credentialsSupported,
    display: issuerDisplay,
  });
}

export async function doesIssuerExist() {
  const allIssuers = await agent.modules.openId4VcIssuer.getAllIssuers();

  return allIssuers.length > 0;
}

export async function getIssuer() {
  const issuers = await agent.modules.openId4VcIssuer.getAllIssuers();
  return issuers[0];
}

export async function updateIssuer() {
  const issuer = await getIssuer();

  await agent.modules.openId4VcIssuer.updateIssuerMetadata({
    issuerId: issuer.issuerId,
    credentialsSupported,
    display: issuerDisplay,
  });
}

export const credentialRequestToCredentialMapper: CredentialRequestToCredentialMapper =
  async ({
    credentialsSupported,
    credentialOffer,
    // FIXME: it would be useful if holderBinding would include some metadata on the key type / alg used
    // for the key binding
    holderBinding,
  }) => {
    const credentialSupported = credentialsSupported[0];

    const { issuerDid } = await getOfferSessionMetadata(
      credentialOffer.credential_offer
    );
    const didDocument = await agent.dids.resolveDidDocument(issuerDid);
    const issuerDidUrl = didDocument.verificationMethod?.[0].id;
    if (!issuerDidUrl) throw new Error("Issuer DID URL not found");

    if (
      credentialSupported.format === "vc+sd-jwt" &&
      (credentialSupported.id ===
        animoOpenId4VcPlaygroundCredentialSdJwtVcDid.id ||
        credentialSupported.id ===
          animoOpenId4VcPlaygroundCredentialSdJwtVcJwk.id)
    ) {
      return {
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
          issuer: issuerDid,
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
