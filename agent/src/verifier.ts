import { agent } from "./agent";

export async function createVerifier() {
  return agent.modules.openId4VcVerifier.createVerifier();
}

export async function doesVerifierExist() {
  const allVerifiers = await agent.modules.openId4VcVerifier.getAllVerifiers();

  return allVerifiers.length > 0;
}

export async function getVerifier() {
  const verifiers = await agent.modules.openId4VcVerifier.getAllVerifiers();
  return verifiers[0];
}
