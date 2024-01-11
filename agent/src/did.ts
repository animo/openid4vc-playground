import {
  KeyType,
  DidDocumentBuilder,
  getEd25519VerificationKey2018,
  getJsonWebKey2020,
  getJwkFromJson,
  getJwkFromKey,
} from "@aries-framework/core";
import { agent } from "./agent";
import { AGENT_HOST } from "./constants";

const cleanHost = encodeURIComponent(
  AGENT_HOST.replace("https://", "").replace("http://", "")
);

const did = `did:web:${cleanHost}`;

export async function createDidWeb() {
  const ed25519KeyId = `${did}#ed25519`;
  const ed25519Key = await agent.wallet.createKey({
    keyType: KeyType.Ed25519,
  });

  const p256KeyId = `${did}#p256`;
  const p256Key = await agent.wallet.createKey({
    keyType: KeyType.P256,
  });

  const didDocument = new DidDocumentBuilder(did)
    .addVerificationMethod(
      getEd25519VerificationKey2018({
        key: ed25519Key,
        controller: did,
        id: ed25519KeyId,
      })
    )
    .addVerificationMethod(
      getJsonWebKey2020({
        key: p256Key,
        did,
        verificationMethodId: p256KeyId,
      })
    )
    .addAssertionMethod(ed25519KeyId)
    .addAssertionMethod(p256KeyId)
    .build();

  await agent.dids.import({
    did,
    didDocument,
  });
}

export async function hasDidWeb() {
  const [createdDid] = await agent.dids.getCreatedDids({ did });

  return createdDid !== undefined;
}

export async function getDidWeb() {
  const [createdDid] = await agent.dids.getCreatedDids({ did });

  if (!createdDid || !createdDid.didDocument) {
    throw new Error("did does not exist");
  }

  return createdDid.didDocument;
}
