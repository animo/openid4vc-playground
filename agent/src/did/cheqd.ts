import { agent } from "../agent";
import { CheqdDidCreateOptions } from "@credo-ts/cheqd";
import {
  DidDocumentBuilder,
  utils,
  KeyType,
  getEd25519VerificationKey2018,
} from "@credo-ts/core";

export async function createDidCheqd() {
  // NOTE: we need to pass custom document for cheqd if we want to add it to `assertionMethod`

  const did = `did:cheqd:testnet:${utils.uuid()}`;
  const key = await agent.wallet.createKey({
    keyType: KeyType.Ed25519,
  });

  const ed25519VerificationMethod = getEd25519VerificationKey2018({
    key,
    id: `${did}#key-1`,
    controller: did,
  });

  const didDocument = new DidDocumentBuilder(did)
    .addContext("https://w3id.org/security/suites/ed25519-2018/v1")
    .addVerificationMethod(ed25519VerificationMethod)
    .addAssertionMethod(ed25519VerificationMethod.id)
    .addAuthentication(ed25519VerificationMethod.id)
    .build();

  const didResult = await agent.dids.create<CheqdDidCreateOptions>({
    method: "cheqd",
    didDocument,
    options: {
      network: "testnet",
    },
    secret: {},
  });

  if (didResult.didState.state === "failed") {
    throw new Error("cheqd DID creation failed. " + didResult.didState.reason);
  }

  return [did];
}
