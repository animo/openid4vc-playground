import {
  DifPresentationExchangeService,
  JsonTransformer,
  RecordNotFoundError,
  W3cJsonLdVerifiableCredential,
  W3cJsonLdVerifiablePresentation,
  W3cJwtVerifiableCredential,
  W3cJwtVerifiablePresentation,
  getJwkFromKey,
} from '@credo-ts/core'
import { OpenId4VcVerificationSessionState } from '@credo-ts/openid4vc'
import { OpenId4VcIssuanceSessionRepository } from '@credo-ts/openid4vc/build/openid4vc-issuer/repository'
import express, { type NextFunction, type Request, type Response } from 'express'
import z from 'zod'
import { agent } from './agent'
import { AGENT_HOST } from './constants'
import { getIssuer } from './issuer'
import { credentialSupportedIds } from './issuerMetadata'
import { getX509Certificate } from './keyMethods'
import { getVerifier } from './verifier'

const zCreateOfferRequest = z.object({
  // FIXME: rename offeredCredentials to credentialSupportedIds in AFJ
  credentialSupportedIds: z.array(z.enum(credentialSupportedIds)),
  issuerId: z.string(),
})

export const apiRouter = express.Router()
apiRouter.use(express.json())
apiRouter.use(express.text())
apiRouter.post('/offers/create', async (request: Request, response: Response) => {
  const issuer = await getIssuer()
  // FIXME: somehow JSON doesn't work
  const createOfferRequest = zCreateOfferRequest.parse(
    typeof request.body === 'string' ? JSON.parse(request.body) : request.body
  )

  const offer = await agent.modules.openId4VcIssuer.createCredentialOffer({
    issuerId: issuer.issuerId,
    offeredCredentials: createOfferRequest.credentialSupportedIds,
    preAuthorizedCodeFlowConfig: {
      userPinRequired: false,
    },
  })

  return response.json(offer)
})

apiRouter.get('/issuer', async (_, response: Response) => {
  const issuer = await getIssuer()

  return response.json({
    credentialsSupported: issuer.credentialsSupported.map((c) => ({
      display: (c as { vct: string }).vct,
      id: c.id,
    })),
    display: issuer.display,
    availableX509Certificates: [AGENT_HOST],
  })
})

const zReceiveOfferRequest = z.object({
  credentialOfferUri: z.string().url(),
})

apiRouter.post('/offers/receive', async (request: Request, response: Response) => {
  const receiveOfferRequest = zReceiveOfferRequest.parse(
    typeof request.body === 'string' ? JSON.parse(request.body) : request.body
  )

  const resolvedOffer = await agent.modules.openId4VcHolder.resolveCredentialOffer(
    receiveOfferRequest.credentialOfferUri
  )
  const token = await agent.modules.openId4VcHolder.requestToken({
    resolvedCredentialOffer: resolvedOffer,
  })
  const credentials = await agent.modules.openId4VcHolder.requestCredentials({
    resolvedCredentialOffer: resolvedOffer,
    accessToken: token.accessToken,
    cNonce: token.cNonce,
    credentialBindingResolver: async ({ keyType, supportsJwk }) => {
      if (supportsJwk) {
        const key = await agent.wallet.createKey({
          keyType,
        })

        return {
          method: 'jwk',
          jwk: getJwkFromKey(key),
        }
      }

      throw new Error('only jwk is supported for holder binding')
    },
  })

  return response.json({
    credentials: credentials.map((credential) => JSON.stringify(credential.credential.payload)),
  })
})

const zCreatePresentationRequestBody = z.object({
  presentationDefinition: z.record(z.string(), z.any()),
})

apiRouter.post('/requests/create', async (request: Request, response: Response) => {
  const verifier = await getVerifier()

  // FIXME: somehow JSON doesn't work
  const createPresentationRequestBody = zCreatePresentationRequestBody.parse(
    typeof request.body === 'string' ? JSON.parse(request.body) : request.body
  )

  const x509Certificate = getX509Certificate()

  const { authorizationRequest, verificationSession } =
    await agent.modules.openId4VcVerifier.createAuthorizationRequest({
      verifierId: verifier.verifierId,
      requestSigner: {
        method: 'x5c',
        x5c: [x509Certificate],
        issuer: AGENT_HOST,
      },
      presentationExchange: {
        definition: createPresentationRequestBody.presentationDefinition as any,
      },
    })

  return response.json({
    authorizationRequestUri: authorizationRequest,
    verificationSessionId: verificationSession.id,
  })
})

const zReceivePresentationRequestBody = z.object({
  authorizationRequestUri: z.string().url(),
})

apiRouter.get('/requests/:verificationSessionId', async (request, response) => {
  const verificationSessionId = request.params.verificationSessionId

  try {
    const verificationSession = await agent.modules.openId4VcVerifier.getVerificationSessionById(verificationSessionId)

    if (verificationSession.state === OpenId4VcVerificationSessionState.ResponseVerified) {
      const verified = await agent.modules.openId4VcVerifier.getVerifiedAuthorizationResponse(verificationSessionId)

      return response.json({
        verificationSessionId: verificationSession.id,
        responseStatus: verificationSession.state,
        error: verificationSession.errorMessage,

        presentations: verified.presentationExchange?.presentations.map((presentation) => {
          if (presentation instanceof W3cJsonLdVerifiablePresentation) {
            return {
              pretty: presentation.toJson(),
              encoded: presentation.toJson(),
            }
          }

          if (presentation instanceof W3cJwtVerifiablePresentation) {
            return {
              pretty: JsonTransformer.toJSON(presentation.presentation),
              encoded: presentation.serializedJwt,
            }
          }

          return {
            pretty: {
              ...presentation,
              compact: undefined,
            },
            encoded: presentation.compact,
          }
        }),
        submission: verified.presentationExchange?.submission,
        definition: verified.presentationExchange?.definition,
      })
    }

    return response.json({
      verificationSessionId: verificationSession.id,
      responseStatus: verificationSession.state,
      error: verificationSession.errorMessage,
    })
  } catch (error) {
    if (error instanceof RecordNotFoundError) {
      return response.status(404).send('Verification session not found')
    }
  }
})

apiRouter.post('/requests/receive', async (request: Request, response: Response) => {
  const receivePresentationRequestBody = zReceivePresentationRequestBody.parse(
    typeof request.body === 'string' ? JSON.parse(request.body) : request.body
  )

  const resolved = await agent.modules.openId4VcHolder.resolveSiopAuthorizationRequest(
    receivePresentationRequestBody.authorizationRequestUri
  )

  if (!resolved.presentationExchange) {
    return response.status(500).json({
      error: 'Expected presentation_definition to be included in authorization request',
    })
  }

  // FIXME: expose PresentationExchange API (or allow auto-select in another way)
  const presentationExchangeService = agent.dependencyManager.resolve(DifPresentationExchangeService)

  const selectedCredentials = presentationExchangeService.selectCredentialsForRequest(
    resolved.presentationExchange?.credentialsForRequest
  )

  const { submittedResponse, serverResponse } = await agent.modules.openId4VcHolder.acceptSiopAuthorizationRequest({
    authorizationRequest: resolved.authorizationRequest,
    presentationExchange: {
      credentials: selectedCredentials,
    },
  })

  return response.status(serverResponse.status).json(submittedResponse)
})

apiRouter.use((error: Error, request: Request, response: Response, next: NextFunction) => {
  console.error('Unhandled error', error)
  return response.status(500).json({
    error: error.message,
  })
})
