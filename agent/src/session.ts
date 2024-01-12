// FIXME: we should not export the type like this
import { CredentialOfferPayloadV1_0_11 } from "@aries-framework/openid4vc";
import { agent } from "./agent";

interface OfferSessionMetadata {
  issuerDid: string;
}

export async function setOfferSessionMetadata(
  offer: CredentialOfferPayloadV1_0_11,
  metadata: OfferSessionMetadata
) {
  const preAuthorizedCode = offer.grants?.[
    "urn:ietf:params:oauth:grant-type:pre-authorized_code"
  ]?.["pre-authorized_code"] as string;

  const offerSession = await agent.modules.openId4VcIssuer.config
    .getCredentialOfferSessionStateManager(agent.context)
    .get(preAuthorizedCode);

  // FIXME: there needs to be a better way to set the issuerDid
  offerSession!.credentialDataSupplierInput = metadata;
}

export async function getOfferSessionMetadata(
  offer: CredentialOfferPayloadV1_0_11
) {
  const preAuthorizedCode = offer.grants?.[
    "urn:ietf:params:oauth:grant-type:pre-authorized_code"
  ]?.["pre-authorized_code"] as string;

  const offerSession = await agent.modules.openId4VcIssuer.config
    .getCredentialOfferSessionStateManager(agent.context)
    .get(preAuthorizedCode);

  return offerSession?.credentialDataSupplierInput as OfferSessionMetadata;
}
