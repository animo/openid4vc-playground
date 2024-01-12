import { CredentialRequestToCredentialMapper } from "@aries-framework/openid4vc";
import { agent } from "./agent";
import {
  animoOpenId4VcPlaygroundCredential,
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

    if (credentialSupported.id === animoOpenId4VcPlaygroundCredential.id) {
      return {
        holder: holderBinding,
        // TODO: add some extra fields
        payload: {
          vct: animoOpenId4VcPlaygroundCredential.vct,

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

    throw new Error(`Unsupported credential ${credentialSupported.id}`);
  };
