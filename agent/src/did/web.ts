import {
  KeyType,
  DidDocumentBuilder,
  getEd25519VerificationKey2018,
  getJsonWebKey2020,
} from "@aries-framework/core";
import { agent } from "../agent";
import { AGENT_HOST } from "../constants";

const cleanHost = encodeURIComponent(
  AGENT_HOST.replace("https://", "").replace("http://", "")
);

const didWeb = `did:web:${cleanHost}`;

export async function createDidWeb() {
  const ed25519KeyId = `${didWeb}#ed25519`;
  const ed25519Key = await agent.wallet.createKey({
    keyType: KeyType.Ed25519,
  });

  const p256KeyId = `${didWeb}#p256`;
  const p256Key = await agent.wallet.createKey({
    keyType: KeyType.P256,
  });

  const didDocument = new DidDocumentBuilder(didWeb)
    .addVerificationMethod(
      getEd25519VerificationKey2018({
        key: ed25519Key,
        controller: didWeb,
        id: ed25519KeyId,
      })
    )
    .addVerificationMethod(
      getJsonWebKey2020({
        key: p256Key,
        did: didWeb,
        verificationMethodId: p256KeyId,
      })
    )
    .addAssertionMethod(ed25519KeyId)
    .addAssertionMethod(p256KeyId)
    .addAuthentication(ed25519KeyId)
    .addAuthentication(p256KeyId)
    .build();

  await agent.dids.import({
    did: didWeb,
    didDocument,
  });
}

export async function getWebDidDocument() {
  const [createdDid] = await agent.dids.getCreatedDids({ did: didWeb });

  if (!createdDid || !createdDid.didDocument) {
    throw new Error(`did does not exist`);
  }

  return createdDid.didDocument;
}
