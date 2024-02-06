import { KeyType, TypedArrayEncoder } from "@credo-ts/core";
import { indyDidFromPublicKeyBase58 } from "@credo-ts/core/build/utils";
import { agent } from "../agent";

export async function importIndyDid(
  namespaceIdentifier: string,
  privateKey: string
) {
  const key = await agent.wallet.createKey({
    keyType: KeyType.Ed25519,
    privateKey: TypedArrayEncoder.fromString(privateKey),
  });

  const indyDid = `did:indy:${namespaceIdentifier}:${indyDidFromPublicKeyBase58(
    key.publicKeyBase58
  )}`;

  console.log({
    indyDid,
    publicKeyBase58: key.publicKeyBase58,
  });
  await agent.dids.import({
    did: indyDid,
    overwrite: true,
  });
}
