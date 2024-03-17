import { agent } from "./agent";

const verifierId = "c01ea0f3-34df-41d5-89d1-50ef3d181855";

export async function createVerifier() {
  return agent.modules.openId4VcVerifier.createVerifier({
    verifierId,
  });
}

export async function doesVerifierExist() {
  try {
    await agent.modules.openId4VcVerifier.getVerifierByVerifierId(verifierId);
    return true;
  } catch (error) {
    return false;
  }
}

export async function getVerifier() {
  return agent.modules.openId4VcVerifier.getVerifierByVerifierId(verifierId);
}
