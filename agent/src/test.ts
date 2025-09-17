import process from 'node:process'
import { AskarModule } from '@credo-ts/askar'
import { Agent, Kms, getPublicJwkFromVerificationMethod } from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/node'
import { OpenId4VcHolderModule, type OpenId4VciCredentialBindingResolver } from '@credo-ts/openid4vc'
import { askar } from '@openwallet-foundation/askar-nodejs'

async function wait(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

async function main() {
  const agent = new Agent({
    config: {
      label: 'Holder',
      allowInsecureHttpUrls: true,
    },
    dependencies: agentDependencies,
    modules: {
      askar: new AskarModule({
        askar,
        store: {
          id: 'openid4vc-test',
          key: 'my-key',
        },
      }),
      openId4VcHolder: new OpenId4VcHolderModule(),
    },
  })

  agent.x509.config.addTrustedCertificate(`-----BEGIN CERTIFICATE-----
MIIB/TCCAaSgAwIBAgIRALhnrBFjnKa5iTuWtWzvN6kwCgYIKoZIzj0EAwIwHTEO
MAwGA1UEAxMFQW5pbW8xCzAJBgNVBAYTAk5MMB4XDTI0MDgyMTExMzEzMFoXDTI4
MDgyMTExMzEzMFowHTEOMAwGA1UEAxMFQW5pbW8xCzAJBgNVBAYTAk5MMFkwEwYH
KoZIzj0CAQYIKoZIzj0DAQcDQgAE3A9V8ynqRcVjADqlfpZ9X8mwbew0TuQldH/Q
OpkadsVp/ZUfI7gzOISFR4F+h5lUEz5ZPJmX4OIwLr936xLgwqOBxDCBwTAdBgNV
HQ4EFgQUg6UwP6BDZje9TvTnbYyzr6BZWoQwDgYDVR0PAQH/BAQDAgEGMDgGA1Ud
EgQxMC+GLWh0dHBzOi8vZHJhZ29uLXByb21wdC1zb2NpYWxseS5uZ3Jvay1mcmVl
LmFwcDASBgNVHRMBAf8ECDAGAQH/AgEAMEIGA1UdHwQ7MDkwN6A1oDOGMWh0dHBz
Oi8vZHJhZ29uLXByb21wdC1zb2NpYWxseS5uZ3Jvay1mcmVlLmFwcC9jcmwwCgYI
KoZIzj0EAwIDRwAwRAIgdV4vQiHNsVAipkMjDqadwO+xXwZX9iD/v1JfMpxG/kAC
IF4lTC3tVAKPIxgkBVXPD5RJnq1tq1BbZ+FSwRKEslxP
-----END CERTIFICATE-----`)

  const key = await agent.kms.createKey({
    type: {
      kty: 'EC',
      crv: 'P-256',
    },
  })

  const publicJwk = Kms.PublicJwk.fromPublicJwk(key.publicJwk)

  const credentialBindingResolver: OpenId4VciCredentialBindingResolver = ({ supportsJwk, supportedDidMethods }) => {
    return {
      method: 'jwk',
      keys: [publicJwk],
    }
  }

  await agent.initialize()

  const url =
    'openid-credential-offer://?credential_offer_uri=https%3A%2F%2Fdragon-prompt-socially.ngrok-free.app%2Foid4vci%2F188e2459-6da8-4431-9062-2fcdac274f41%2Foffers%2F080ff6ad-ca5a-4acc-a641-8766b4ac891c'

  const resolvedCredentialOffer = await agent.modules.openId4VcHolder.resolveCredentialOffer(url)

  const accessTokenResponse = await agent.modules.openId4VcHolder.requestToken({
    resolvedCredentialOffer,
    clientId: 'openid4vc-test',
  })

  const credentialResponse = await agent.modules.openId4VcHolder.requestCredentials({
    resolvedCredentialOffer,
    ...accessTokenResponse,
    credentialBindingResolver,
  })

  console.log('Credential Response:', credentialResponse)

  if (credentialResponse.deferredCredentials.length === 0) {
    console.log('No deferred credentials found.')
    return
  }

  if (!accessTokenResponse.refreshToken) {
    console.error('No refresh token found in the access token response.')
    return
  }

  const interval = Math.min(...credentialResponse.deferredCredentials.map((credential) => credential.interval ?? 1000))

  console.log(interval)

  while (true) {
    await wait(interval)

    console.log('Fetching new access token based on refresh token...', accessTokenResponse.refreshToken)

    const refreshTokenResponse = await agent.modules.openId4VcHolder.refreshToken({
      clientId: 'openid4vc-test',
      issuerMetadata: resolvedCredentialOffer.metadata,
      authorizationServer: accessTokenResponse.authorizationServer,
      refreshToken: accessTokenResponse.refreshToken,
    })

    console.dir(refreshTokenResponse, { depth: Number.POSITIVE_INFINITY })

    console.log('Fetching deferred credentials...')

    for (const deferredCredential of credentialResponse.deferredCredentials) {
      const deferredCredentialResponse = await agent.modules.openId4VcHolder.requestDeferredCredentials({
        ...refreshTokenResponse,
        ...deferredCredential,
        issuerMetadata: resolvedCredentialOffer.metadata,
      })

      console.dir(deferredCredentialResponse, { depth: Number.POSITIVE_INFINITY })
    }
  }
}

main().catch((error) => {
  console.error('An error occurred:', error)
  process.exit(1)
})
