import { Key, DidKey } from "@credo-ts/core";
import { agent } from "../agent";

export async function createDidKey(keys: Key[]) {
  const createdDids: string[] = [];

  for (const key of keys) {
    const didKey = new DidKey(key);
    await agent.dids.import({
      overwrite: true,
      did: didKey.did,
    });
    createdDids.push(didKey.did);
  }

  return createdDids;
}
