import { DidJwk, Key, getJwkFromKey } from "@credo-ts/core";
import { agent } from "../agent";

export async function createDidJwk(keys: Key[]) {
  const createdDids: string[] = [];
  for (const key of keys) {
    const didJwk = DidJwk.fromJwk(getJwkFromKey(key));
    await agent.dids.import({
      overwrite: true,
      did: didJwk.did,
    });
    createdDids.push(didJwk.did);
  }

  return createdDids;
}
