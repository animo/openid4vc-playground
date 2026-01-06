import { AGENT_HOST, ISSUER_CLIENT_SECRET } from '../constants.js'
import { issuers as _issuers } from '../issuers/index.js'

const issuers = _issuers.map((issuer) => ({
  ...issuer,
  scopes: Object.values(issuer.credentialConfigurationsSupported).flatMap((s) =>
    Object.values(s).map((c) => c.configuration.scope as string)
  ),
  issuerUrl: `${AGENT_HOST}/oid4vci/${issuer.issuerId}`,
}))

const oidcRouterPath = '/provider'

async function getProvider() {
  const { Provider } = await import('oidc-provider')
  const oidc = new Provider(`${AGENT_HOST}${oidcRouterPath}`, {
    clientAuthMethods: ['client_secret_post'],
    clients: [
      {
        client_id: 'issuer-server',
        client_secret: ISSUER_CLIENT_SECRET,
        id_token_signed_response_alg: 'ES256',
        redirect_uris: issuers.map((i) => `${i.issuerUrl}/redirect`),
        token_endpoint_auth_method: 'client_secret_post',
        application_type: 'native',
      },
    ],
    jwks: {
      keys: [
        {
          alg: 'ES256',
          kid: 'first-key',
          kty: 'EC',
          d: '2hdTKWEZza_R-DF4l3aoWEuGZPy6L6PGmUT_GqeJczM',
          crv: 'P-256',
          x: '73lW9QyiXTvpOOXuT_LoRRvM3oEWKSLyzfNGe04sV5k',
          y: 'AiFefLdnP-cWkdsevwozKdxNGvF_VSSZ1K5yDQ4jWwM',
        },
      ],
    },
    scopes: issuers.flatMap((i) => i.scopes),
    pkce: {
      required: () => true,
    },
    clientBasedCORS: () => true,
    features: {
      dPoP: { enabled: true },
      pushedAuthorizationRequests: {
        enabled: false,
      },
      introspection: {
        enabled: true,
      },
      resourceIndicators: {
        enabled: true,
      },
    },

    async findAccount(_, id) {
      return {
        accountId: id,
        async claims() {
          return { sub: id }
        },
      }
    },
  })

  oidc.proxy = true

  oidc.on('grant.error', (ctx, err) => console.error('err', err, ctx.body, ctx.headers))
  oidc.on('introspection.error', (_, err) => console.error('err', err))
  oidc.on('revocation.error', (_, err) => console.error('err', err))

  return oidc
}

const oidcUrl = `${AGENT_HOST}${oidcRouterPath}`
export { getProvider, oidcRouterPath, oidcUrl }
