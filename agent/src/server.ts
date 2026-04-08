import '@openwallet-foundation/askar-nodejs'
import { JwsService, JwtPayload, Kms } from '@credo-ts/core'
import type { Request, Response } from 'express'

import express from 'express'
import path from 'path'
import { agent } from './agent.js'
import { app } from './app.js'
import { AGENT_HOST, ISSUER_CLIENT_SECRET } from './constants.js'
import { createDidWeb, getWebDidDocument } from './didWeb.js'
import { apiRouter } from './endpoints.js'
import { createOrUpdateIssuer, type PlaygroundIssuerOptions } from './issuer.js'
import { issuers } from './issuers/index.js'
import { openHorizonbankCredentialMetadata, openHorizonIssuerId } from './issuers/openHorizonBank.js'
import { dcsId, getCertificateRevocationList, getX509DcsCertificate, setupX509Certificate } from './keyMethods/index.js'
import { getProvider, oidcRouterPath, oidcUrl } from './oidcProvider/provider.js'
import { dateToSeconds } from './utils/date.js'
import { createOrUpdateVerifier } from './verifier.js'
import { verifiers } from './verifiers/index.js'

const dirname = import.meta.dirname

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
    console.log(path.join(dirname, '../../app/public/assets'))
    app.use('/assets', express.static(path.join(dirname, '../../app/public/assets')))
  }

  app.use('/api', apiRouter)
  app.use('/.well-known/did.json', async (_, response: Response) => {
    const didWeb = await getWebDidDocument()
    return response.json(didWeb.toJSON())
  })

  // TODO: make URL issuer-specific
  //       Handle `Accept-Language` header
  app.use('/payments-credential-metadata', async (request: Request, response: Response) => {
    if (!dcsId) {
      return response.status(500)
    }
    const now = new Date()
    const expiry = new Date()
    expiry.setFullYear(now.getFullYear() + 3)

    const issuerMetadata = await agent.openid4vc.issuer.getIssuerMetadata(openHorizonIssuerId)

    if (request.accepts('application/jwt')) {
      const jwsService = agent.dependencyManager.resolve(JwsService)
      const jws = await jwsService.createJwsCompact(agent.context, {
        keyId: dcsId,
        payload: new JwtPayload({
          iss: openHorizonIssuerId,
          sub: 'vct',
          iat: dateToSeconds(now),
          exp: dateToSeconds(expiry),
          additionalClaims: {
            format: 'dc+sd-jwt',
            credential_metadata_uri: `${AGENT_HOST}/payments-credential-metadata`,
            credential_metadata: { ...issuerMetadata.credentialIssuer, ...openHorizonbankCredentialMetadata },
          },
        }),
        protectedHeaderOptions: {
          alg: Kms.KnownJwaSignatureAlgorithms.ES256,
          typ: 'credential-metadata+jwt',
          x5c: [getX509DcsCertificate().toString('pem')],
        },
      })
      return response.send(jws)
    }

    if (request.accepts('json')) {
      return response.json(openHorizonbankCredentialMetadata)
    }

    return response.status(404)
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
