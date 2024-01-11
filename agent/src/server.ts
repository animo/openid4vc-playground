import { agent, openId4VciRouter } from "./agent";
import { apiRouter } from "./endpoints";
import { createIssuer, doesIssuerExist } from "./issuer";
import express, { Response } from "express";
import { createDidWeb, getDidWeb, hasDidWeb } from "./did";
import cors from "cors";

async function run() {
  await agent.initialize();

  if (!(await doesIssuerExist())) {
    await createIssuer();
  }

  if (!(await hasDidWeb())) {
    await createDidWeb();
  }

  const app = express();
  app.use(cors({ origin: "*" }));

  app.use("/oid4vci", openId4VciRouter);
  app.use("/api", apiRouter);
  app.use("/.well-known/did.json", async (_, response: Response) => {
    const didWeb = await getDidWeb();
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
