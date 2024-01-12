import {
  CHEQD_TESTNET_COSMOS_PAYER_SEED,
  DID_INDY_INDICIO_TESTNET_PUBLIC_DID_SEED,
} from "../constants";
import { createDidCheqd } from "./cheqd";
import { importIndyDid } from "./indy";
import { createDidJwk } from "./jwk";
import { createDidKey } from "./key";
import { getDidForMethod, hasDidForMethod } from "./util";
import { createDidWeb } from "./web";

const availableDids: string[] = [];

export async function setupAllDids() {
  if (!(await hasDidForMethod("key"))) {
    await createDidKey();
  }
  availableDids.push(await getDidForMethod("key"));

  if (!(await hasDidForMethod("jwk"))) {
    await createDidJwk();
  }
  availableDids.push(await getDidForMethod("jwk"));

  if (!(await hasDidForMethod("web"))) {
    await createDidWeb();
  }
  availableDids.push(await getDidForMethod("web"));

  if (CHEQD_TESTNET_COSMOS_PAYER_SEED) {
    if (!(await hasDidForMethod("cheqd"))) {
      await createDidCheqd();
    }
    availableDids.push(await getDidForMethod("cheqd"));
  }

  // FIXME: indy not fully working yet
  // if (DID_INDY_INDICIO_TESTNET_PUBLIC_DID_SEED) {
  //   if (!(await hasDidForMethod("indy"))) {
  //     await importIndyDid(
  //       "indicio:testnet",
  //       DID_INDY_INDICIO_TESTNET_PUBLIC_DID_SEED
  //     );
  //   }
  //   availableDids.push(await getDidForMethod("indy"));
  // }
}

export function getAvailableDids() {
  return availableDids;
}
