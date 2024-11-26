import path from 'path'
import cors from 'cors'
import express from 'express'
import { agent, openId4VciRouter, openId4VpRouter } from './agent'
import { AGENT_HOST } from './constants'
import { apiRouter } from './endpoints'
import { createOrUpdateIssuer } from './issuer'
import { issuers } from './issuers'
import { setupX509Certificate } from './keyMethods'
import { getProvider, oidcRouterPath, oidcUrl } from './oidcProvider/provider'
import { createOrUpdateVerifier } from './verifier'
import { verifiers } from './verifiers'

async function run() {
  await agent.initialize()

  for (const issuer of issuers) {
    await createOrUpdateIssuer({
      ...issuer,
      authorizationServerConfigs: [
        {
          issuer: oidcUrl,
          clientAuthentication: {
            clientId: 'issuer-server',
            clientSecret: 'issuer-server',
          },
        },
      ],
    })
  }

  for (const verifier of verifiers) {
    await createOrUpdateVerifier(verifier)
  }

  await setupX509Certificate()

  const app = express()
  app.use(cors({ origin: '*' }))
  app.use(express.json())
  app.use(express.urlencoded())

  // Hack for making images available
  if (AGENT_HOST.includes('ngrok') || AGENT_HOST.includes('.ts.net') || AGENT_HOST.includes('localhost')) {
    console.log(path.join(__dirname, '../../app/public/assets'))
    app.use('/assets', express.static(path.join(__dirname, '../../app/public/assets')))
  }

  app.use('/oid4vci', openId4VciRouter)
  app.use('/siop', openId4VpRouter)
  app.use('/api', apiRouter)
  app.use((request, _, next) => {
    if (request.path === '/provider/request' || request.path === '/provider/token') {
      request.body.client_id = 'wallet'
      request.body.client_secret = 'wallet'
    }
    next()
  })
  const oidc = await getProvider()
  app.use(oidcRouterPath, oidc.callback())

  app.listen(3001, () => agent.config.logger.info('app listening on port 3001'))

  // @ts-ignore
  app.use((err, _, res, __) => {
    console.error(err.stack)
    res.status(500).send('Something broke!')
  })
}

run()
