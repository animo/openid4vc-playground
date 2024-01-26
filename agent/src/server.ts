import { agent, openId4VciRouter, openId4VpRouter } from "./agent";
import { apiRouter } from "./endpoints";
import { createIssuer, doesIssuerExist, updateIssuer } from "./issuer";
import { createVerifier, doesVerifierExist } from "./verifier";
import express, { Response } from "express";
import { getWebDidDocument, setupAllDids } from "./did";
import cors from "cors";

async function run() {
  await agent.initialize();

  if (!(await doesIssuerExist())) {
    await createIssuer();
  } else {
    // We update the issuer metadata on every startup to sync the static issuer metadata with the issuer metadata record
    await updateIssuer();
  }

  if (!(await doesVerifierExist())) {
    await createVerifier();
  }

  await setupAllDids();

  const app = express();
  app.use(cors({ origin: "*" }));

  app.use("/oid4vci", openId4VciRouter);
  app.use("/oid4vp", openId4VpRouter);
  app.use("/api", apiRouter);
  app.use("/.well-known/did.json", async (_, response: Response) => {
    const didWeb = await getWebDidDocument();
    return response.json(didWeb.toJSON());
  });

  app.listen(3001, () =>
    agent.config.logger.info("app listening on port 3001")
  );

  // @ts-ignore
  app.use((err, _, res, __) => {
    console.error(err.stack);
    res.status(500).send("Something broke!");
  });
}

run();
