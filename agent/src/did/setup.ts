import { WalletKeyExistsError } from "@credo-ts/core";
import { createDidCheqd } from "./cheqd";
import { createKeys } from "./createKeys";
import { createDidJwk } from "./jwk";
import { createDidKey } from "./key";
import { createDidWeb } from "./web";
import { agent } from "../agent";

const availableDids: string[] = [];

export async function setupAllDids() {
  try {
    const keys = await createKeys();

    availableDids.push(...(await createDidKey(keys)));
    availableDids.push(...(await createDidJwk(keys)));
    availableDids.push(...(await createDidWeb(keys)));
    availableDids.push(...(await createDidCheqd()));

    await agent.genericRecords.save({
      id: "AVAILABLE_DIDS",
      content: {
        availableDids,
      },
    });
  } catch (error) {
    // If the key already exists, we assume the dids are already created
    if (error instanceof WalletKeyExistsError) {
      const availableDidsRecord = await agent.genericRecords.findById(
        "AVAILABLE_DIDS"
      );
      if (!availableDidsRecord) {
        throw new Error("No available dids record found");
      }
      availableDids.push(
        ...(availableDidsRecord.content.availableDids as string[])
      );

      return;
    }

    throw error;
  }
}

export function getAvailableDids() {
  return availableDids;
}
