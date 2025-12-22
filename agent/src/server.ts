import '@openwallet-foundation/askar-nodejs'
import { Kms } from '@credo-ts/core'
import type { Response } from 'express'

import express from 'express'
import path from 'path'
import { agent } from './agent'
import { app } from './app'
import { AGENT_HOST, ISSUER_CLIENT_SECRET } from './constants'
import { createDidWeb, getWebDidDocument } from './didWeb'
import { apiRouter } from './endpoints'
import { createOrUpdateIssuer, type PlaygroundIssuerOptions } from './issuer'
import { issuers } from './issuers'
import { getCertificateRevocationList, setupX509Certificate } from './keyMethods'
import { getProvider, oidcRouterPath, oidcUrl } from './oidcProvider/provider'
import { createOrUpdateVerifier } from './verifier'
import { verifiers } from './verifiers'

async function run() {
  await agent.initialize()

  for (const issuer of issuers as PlaygroundIssuerOptions[]) {
    const { tags, credentialConfigurationsSupported, ...restIssuer } = issuer
    await createOrUpdateIssuer({
      ...restIssuer,
      credentialConfigurationsSupported: Object.fromEntries(
        credentialConfigurationsSupported.flatMap((item) =>
          Object.values(item).flatMap((itemitem) => [
            [itemitem.data.credentialConfigurationId, itemitem.configuration],
            [
              `${itemitem.data.credentialConfigurationId}-key-attestations`,
              { ...itemitem.configuration, proof_types_supported: {} },
            ],
            ...(itemitem.configuration.format === 'dc+sd-jwt'
              ? [
                  [
                    `${itemitem.data.credentialConfigurationId}-key-attestations`,
                    {
                      ...itemitem.configuration,
                      format: 'dc+sd-jwt',
                      proof_types_supported: {
                        jwt: {
                          proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
                          key_attestations_required: {
                            user_authentication: ['iso_18045_high'],
                            key_storage: ['iso_18045_high'],
                          },
                        },
                        attestation: {
                          proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
                          key_attestations_required: {
                            user_authentication: ['iso_18045_high'],
                            key_storage: ['iso_18045_high'],
                          },
                        },
                      },
                    },
                  ],
                ]
              : []),
            [
              `${itemitem.data.credentialConfigurationId}-key-attestations`,
              {
                ...itemitem.configuration,
                proof_types_supported: {
                  jwt: {
                    proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
                    key_attestations_required: {
                      user_authentication: ['iso_18045_high'],
                      key_storage: ['iso_18045_high'],
                    },
                  },
                  attestation: {
                    proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
                    key_attestations_required: {
                      user_authentication: ['iso_18045_high'],
                      key_storage: ['iso_18045_high'],
                    },
                  },
                },
              },
            ],
          ])
        )
      ),
      dpopSigningAlgValuesSupported: [Kms.KnownJwaSignatureAlgorithms.ES256],
      accessTokenSignerKeyType: {
        kty: 'EC',
        crv: 'P-256',
      },
      authorizationServerConfigs: [
        {
          type: 'chained',
          scopesMapping: Object.fromEntries(
            credentialConfigurationsSupported.flatMap((c) =>
              Object.values(c).map((cc) => [cc.configuration.scope, cc.configuration.scope])
            )
          ),
          issuer: oidcUrl,
          clientAuthentication: {
            type: 'clientSecret',
            clientId: 'issuer-server',
            clientSecret: ISSUER_CLIENT_SECRET,
          },
        },
      ],
    })
  }

  for (const verifier of verifiers) {
    await createOrUpdateVerifier(verifier)
  }

  await setupX509Certificate()
  await getWebDidDocument().catch(async () => {
    const { publicJwk } = await agent.kms.createKey({
      type: {
        kty: 'OKP',
        crv: 'Ed25519',
      },
    })
    await createDidWeb(Kms.PublicJwk.fromPublicJwk(publicJwk))
  })

  // Hack for making images available
  if (AGENT_HOST.includes('ngrok') || AGENT_HOST.includes('.ts.net') || AGENT_HOST.includes('localhost')) {
    console.log(path.join(__dirname, '../../app/public/assets'))
    app.use('/assets', express.static(path.join(__dirname, '../../app/public/assets')))
  }

  app.use('/api', apiRouter)
  app.use('/.well-known/did.json', async (_, response: Response) => {
    const didWeb = await getWebDidDocument()
    return response.json(didWeb.toJSON())
  })

  app.use('/crl', async (_, response) => {
    return response.contentType('application/pkix-crl').send(getCertificateRevocationList())
  })

  const oidc = await getProvider()
  app.use(oidcRouterPath, oidc.callback())

  app.listen(3001, () => agent.config.logger.info('app listening on port 3001'))

  // @ts-expect-error
  app.use((err, _, res, __) => {
    console.error(err.stack)
    res.status(500).send('Something broke!')
  })
}

run()
