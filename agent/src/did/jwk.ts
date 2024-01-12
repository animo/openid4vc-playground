import { KeyType, JwkDidCreateOptions } from "@aries-framework/core";
import { agent } from "../agent";

export async function createDidJwk() {
  await agent.dids.create<JwkDidCreateOptions>({
    method: "jwk",
    options: {
      keyType: KeyType.Ed25519,
    },
  });
}
