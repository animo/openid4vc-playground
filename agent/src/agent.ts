import { AskarModule } from '@credo-ts/askar'
import { Agent, ConsoleLogger, LogLevel, X509Module, joinUriParts } from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/node'
import { OpenId4VcHolderModule, OpenId4VcIssuerModule, OpenId4VcVerifierModule } from '@credo-ts/openid4vc'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'
import { Router } from 'express'
import { AGENT_HOST, AGENT_WALLET_KEY } from './constants'
import { credentialRequestToCredentialMapper } from './issuer'

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection', reason)
})

export const openId4VciRouter = Router()
export const openId4VpRouter = Router()

export const agent = new Agent({
  dependencies: agentDependencies,
  config: {
    label: 'OpenID4VC Playground',
    logger: new ConsoleLogger(LogLevel.trace),
    // TODO: add postgres storage
    walletConfig: {
      id: 'openid4vc-playground',
      key: AGENT_WALLET_KEY,
    },
  },
  modules: {
    askar: new AskarModule({
      ariesAskar,
    }),
    openId4VcIssuer: new OpenId4VcIssuerModule({
      baseUrl: joinUriParts(AGENT_HOST, ['oid4vci']),
      router: openId4VciRouter,
      endpoints: {
        credential: {
          credentialRequestToCredentialMapper,
        },
      },
    }),
    openId4VcHolder: new OpenId4VcHolderModule(),
    openId4VcVerifier: new OpenId4VcVerifierModule({
      baseUrl: joinUriParts(AGENT_HOST, ['siop']),
      router: openId4VpRouter,
    }),
    x509: new X509Module(),
  },
})
