import { KeyType, TypedArrayEncoder } from "@credo-ts/core";
import { agent } from "../agent";
import { ED25519_SEED, P256_SEED } from "../constants";

export async function createKeys() {
  const ed25519Key = await agent.wallet.createKey({
    keyType: KeyType.Ed25519,
    seed: TypedArrayEncoder.fromString(ED25519_SEED),
  });

  const p256Key = await agent.wallet.createKey({
    keyType: KeyType.P256,
    seed: TypedArrayEncoder.fromString(P256_SEED),
  });

  return [ed25519Key, p256Key];
}
