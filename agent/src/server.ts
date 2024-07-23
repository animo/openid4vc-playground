import cors from 'cors'
import express from 'express'
import { agent, openId4VciRouter, openId4VpRouter } from './agent'
import { apiRouter } from './endpoints'
import { createIssuer, doesIssuerExist, updateIssuer } from './issuer'
import { setupX509Certificate } from './keyMethods'
import { createVerifier, doesVerifierExist } from './verifier'

async function run() {
  await agent.initialize()

  if (!(await doesIssuerExist())) {
    await createIssuer()
  } else {
    // We update the issuer metadata on every startup to sync the static issuer metadata with the issuer metadata record
    await updateIssuer()
  }

  if (!(await doesVerifierExist())) {
    await createVerifier()
  }

  await setupX509Certificate()

  const app = express()
  app.use(cors({ origin: '*' }))

  app.use('/oid4vci', openId4VciRouter)
  app.use('/siop', openId4VpRouter)
  app.use('/api', apiRouter)

  app.listen(3001, () => agent.config.logger.info('app listening on port 3001'))

  // @ts-ignore
  app.use((err, _, res, __) => {
    console.error(err.stack)
    res.status(500).send('Something broke!')
  })
}

run()
