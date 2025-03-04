import * as express from 'express'
import { AGENT_HOST } from '../constants'
import { issuers as _issuers } from '../issuers'

const issuers = _issuers.map((issuer) => ({
  ...issuer,
  scopes: Object.values(issuer.credentialConfigurationsSupported).flatMap((s) =>
    Object.values(s).map((c) => c.configuration.scope as string)
  ),
  issuerUrl: `${AGENT_HOST}/oid4vci/${issuer.issuerId}`,
}))

const oidcRouterPath = '/provider'
const oidcRouter = express.Router()

// I can't figure out how to bind a custom request parameter to the session
// so it can be bound to the access token. This is a very hacky 'global' issuer_state
// and only works if only person is authenticating. Of course very unsecure, but it's a demo
let issuer_state: string | undefined = undefined

async function getProvider() {
  const { Provider, errors } = await import('oidc-provider')
  const oidc = new Provider(`${AGENT_HOST}${oidcRouterPath}`, {
    clientAuthMethods: ['client_secret_basic', 'client_secret_post', 'none'],
    clients: [
      {
        client_id: 'wallet',
        client_secret: 'wallet',
        grant_types: ['authorization_code'],
        id_token_signed_response_alg: 'ES256',
        redirect_uris: ['io.mosip.residentapp.inji://oauthredirect'],
        application_type: 'native',
      },
      {
        client_id: 'issuer-server',
        client_secret: 'issuer-server',
        id_token_signed_response_alg: 'ES256',
        redirect_uris: [],
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
    scopes: [],
    pkce: {
      methods: ['S256'],
      required: () => true,
    },
    extraTokenClaims: async (context, token) => {
      if (token.kind === 'AccessToken') {
        return {
          issuer_state,
        }
      }
      return undefined
    },
    clientBasedCORS: () => true,
    extraParams: {
      issuer_state: (_, value) => {
        issuer_state = value
      },
    },
    features: {
      dPoP: { enabled: true },
      pushedAuthorizationRequests: {
        enabled: true,
        requirePushedAuthorizationRequests: false,
        allowUnregisteredRedirectUris: true,
      },
      introspection: {
        enabled: true,
      },
      resourceIndicators: {
        // TODO: default resource?
        // defaultResource: () => issuers[0].issuerUrl,
        enabled: true,
        getResourceServerInfo: (context, resourceIndicator) => {
          const issuer = issuers.find((issuer) => issuer.issuerUrl === resourceIndicator)
          if (!issuer) throw new errors.InvalidTarget()

          return {
            scope: issuer.scopes.join(' '),
            accessTokenTTL: 5 * 60, // 5 minutes
            accessTokenFormat: 'jwt',
            // TODO: detect resource?
            audience: issuer.issuerUrl,
            jwt: {
              sign: {
                kid: 'first-key',
                alg: 'ES256',
              },
            },
          }
        },
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

  return oidc
}

const oidcUrl = `${AGENT_HOST}${oidcRouterPath}`
export { oidcRouter, getProvider, oidcRouterPath, oidcUrl }
