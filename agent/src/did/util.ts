import { agent } from "../agent";

export async function hasDidForMethod(method: string) {
  const [createdDid] = await agent.dids.getCreatedDids({ method });

  return createdDid !== undefined;
}

export async function getDidForMethod(method: string) {
  const [createdDid] = await agent.dids.getCreatedDids({ method });

  if (!createdDid) {
    throw new Error(`did for method ${method} does not exist`);
  }

  return createdDid.did;
}
