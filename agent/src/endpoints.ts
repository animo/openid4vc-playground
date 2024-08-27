import {
  DifPresentationExchangeService,
  JsonTransformer,
  KeyType,
  Mdoc,
  MdocVerifiablePresentation,
  RecordNotFoundError,
  TypedArrayEncoder,
  W3cJsonLdVerifiablePresentation,
  W3cJwtVerifiablePresentation,
  getJwkFromKey,
} from '@credo-ts/core'
import { OpenId4VcVerificationSessionState } from '@credo-ts/openid4vc'
import { Key as AskarKey, KeyAlgs } from '@hyperledger/aries-askar-nodejs'
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

apiRouter.get('/x509', async (_, response: Response) => {
  const certificate = getX509Certificate()

  return response.json({
    certificate,
  })
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

  for (const credential of credentials) {
    if ('compact' in credential.credential) {
      await agent.sdJwtVc.store(credential.credential.compact as string)
    }
  }

  return response.json({
    credentials: credentials.map((credential) => {
      if (credential instanceof Mdoc) {
        return credential.credential
      }
      if ('payload' in credential.credential) {
        return credential.credential.payload
      }
      throw new Error('Unsupported credential type')
    }),
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

  const definition = createPresentationRequestBody.presentationDefinition

  try {
    // TODO: disable for real credential
    // Key for the fake credential. Can be removed when the pid issuer updated
    await agent.wallet.createKey({
      keyType: KeyType.P256,
      privateKey: TypedArrayEncoder.fromHex('ad38184e0d5d9af97b023b6421707dc079f7d66a185bfd4c589837e3cb69fbfb'),
    })
    // Ignore key already exist
  } catch {}

  const askarKey = AskarKey.fromSecretBytes({
    secretKey: new Uint8Array(
      TypedArrayEncoder.fromHex('ad38184e0d5d9af97b023b6421707dc079f7d66a185bfd4c589837e3cb69fbfb')
    ),
    algorithm: KeyAlgs.EcSecp256r1,
  })

  const additionalPayloadClaims = {
    rp_eph_pub: {
      jwk: askarKey.jwkPublic,
    },
  }

  // TODO: enable for real credential
  // const key = await agent.context.wallet.createKey({keyType: KeyType.P256})
  // additionalClaims["rp_eph_pub"] = {
  //   jwk: getJwkFromKey(key).toJson(),
  // };

  const { authorizationRequest, verificationSession } =
    await agent.modules.openId4VcVerifier.createAuthorizationRequest({
      verifierId: verifier.verifierId,
      requestSigner: {
        method: 'x5c',
        x5c: [x509Certificate],
        // FIXME: remove issuer param from credo as we can infer it from the url
        issuer: `${AGENT_HOST}/siop/${verifier.verifierId}/authorize`,
      },
      presentationExchange: {
        definition: definition as any,
      },
      // @ts-ignore
      additionalPayloadClaims,
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

      console.log(verified.presentationExchange?.presentations)

      const presentations = await Promise.all(
        verified.presentationExchange?.presentations.map(async (presentation) => {
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

          if (presentation instanceof MdocVerifiablePresentation) {
            const deviceSigned = JSON.parse(presentation.deviceSignedBase64Url).deviceSigned
            const disclosedClaims = await Mdoc.getDisclosedClaims(deviceSigned)
            console.log('disclosedClaims', JSON.stringify(disclosedClaims, null, 2))

            return {
              pretty: JsonTransformer.toJSON(disclosedClaims),
              encoded: deviceSigned,
            }
          }

          return {
            pretty: {
              ...presentation,
              compact: undefined,
            },
            encoded: presentation.compact,
          }
        }) ?? []
      )

      console.log('presentations', presentations)

      return response.json({
        verificationSessionId: verificationSession.id,
        responseStatus: verificationSession.state,
        error: verificationSession.errorMessage,

        presentations: presentations,
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

apiRouter.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  console.error('Unhandled error', error)
  return response.status(500).json({
    error: error.message,
  })
})
