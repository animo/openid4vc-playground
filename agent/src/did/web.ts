import {
  DidDocumentBuilder,
  Key,
  getKeyDidMappingByKeyType,
} from "@credo-ts/core";
import { agent } from "../agent";
import { AGENT_HOST } from "../constants";

const cleanHost = encodeURIComponent(
  AGENT_HOST.replace("https://", "").replace("http://", "")
);

const didWeb = `did:web:${cleanHost}`;

export async function createDidWeb(keys: Key[]) {
  const verificationMethods = keys.flatMap((key) =>
    getKeyDidMappingByKeyType(key.keyType).getVerificationMethods(didWeb, key)
  );

  const didDocumentBuilder = new DidDocumentBuilder(didWeb);

  for (const verificationMethod of verificationMethods) {
    didDocumentBuilder
      .addVerificationMethod(verificationMethod)
      .addAssertionMethod(verificationMethod.id)
      .addAuthentication(verificationMethod.id);
  }

  const didDocument = didDocumentBuilder.build();

  await agent.dids.import({
    did: didWeb,
    didDocument,
  });

  return [didWeb];
}

export async function getWebDidDocument() {
  const [createdDid] = await agent.dids.getCreatedDids({ did: didWeb });

  if (!createdDid || !createdDid.didDocument) {
    throw new Error(`did does not exist`);
  }

  return createdDid.didDocument;
}
