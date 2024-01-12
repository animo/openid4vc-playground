import { KeyType, KeyDidCreateOptions } from "@aries-framework/core";
import { agent } from "../agent";

export async function createDidKey() {
  await agent.dids.create<KeyDidCreateOptions>({
    method: "key",
    options: {
      keyType: KeyType.Ed25519,
    },
  });
}
