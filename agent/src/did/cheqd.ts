import { agent } from "../agent";
import { CheqdDidCreateOptions } from "@aries-framework/cheqd";

export async function createDidCheqd() {
  const didResult = await agent.dids.create<CheqdDidCreateOptions>({
    method: "cheqd",
    options: {
      network: "testnet",
      methodSpecificIdAlgo: "base58btc",
    },
    secret: {
      // FIXME: verificationMethod should be optional in AFJ for cheqd
      verificationMethod: {
        id: "key-1",
        type: "Ed25519VerificationKey2020",
      },
    },
  });

  if (didResult.didState.state === "failed") {
    throw new Error("cheqd DID creation failed. " + didResult.didState.reason);
  }
}
