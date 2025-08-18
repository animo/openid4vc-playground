import type { ResponseMode } from '../components/VerifyBlock'
import { NEXT_PUBLIC_API_URL } from './constants'

export type CreateOfferReturn = { credentialOffer: string; issuanceSession: { userPin?: string } }
export async function createOffer({
  credentialSupportedId,
  authorization,
  requireDpop,
  requireWalletAttestation,
  requireKeyAttestation,
}: {
  credentialSupportedId: string
  authorization: string
  requireDpop: boolean
  requireWalletAttestation: boolean
  requireKeyAttestation: boolean
}): Promise<CreateOfferReturn> {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/offers/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      credentialSupportedIds: [credentialSupportedId],
      authorization,
      requireDpop,
      requireWalletAttestation,
      requireKeyAttestation,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create offer')
  }

  return await response.json()
}

export async function getVerifier() {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/verifier`)

  if (!response.ok) {
    throw new Error('Failed to get verifier')
  }

  return response.json()
}

export type Issuers = Array<{
  id: string
  name: string
  description: string
  logo: string
  tags: string[]
  credentials: Array<{
    display: {
      name: string
      background_image: {
        uri: string
      }
      background_color: string
      text_color: string
    }
    formats: Record<string, string>
  }>
}>
export async function getIssuers(): Promise<Issuers> {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/issuers`)

  if (!response.ok) {
    throw new Error('Failed to get issuers')
  }

  return response.json()
}

export async function addX509Certificate(certificate: string) {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/x509`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({
      certificate,
    }),
  })

  return response
}

export async function getX509Certificate(): Promise<{ base64: string; pem: string; decoded: string }> {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/x509`)

  if (!response.ok) {
    throw new Error('Failed to get x509 certificate')
  }

  return response.json()
}

export async function receiveOffer(offerUri: string) {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/offers/receive`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({
      credentialOfferUri: offerUri,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to receive offer')
  }

  return response.json()
}

export async function createRequest(data: {
  requestSignerType: 'x5c' | 'openid-federation' | 'none'
  presentationDefinitionId: string
  requestScheme: string
  responseMode: ResponseMode
  purpose?: string
  transactionAuthorizationType: 'none' | 'qes'
  version: 'v1.draft21' | 'v1.draft24' | 'v1'
  queryLanguage: 'pex' | 'dcql'
}) {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/requests/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(
      await response
        .json()
        .then(({ message }) => message)
        .catch(() => 'Failed to create request')
    )
  }

  return response.json()
}

export async function verifyResponseDc(data: {
  verificationSessionId: string
  data: string | Record<string, unknown>
}) {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/requests/verify-dc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(
      `Failed to verify response.  
        ${JSON.stringify(
          await response
            .json()
            .then((a) => ('error' in a ? a.error : JSON.stringify(a, null, 2)))
            .catch((e) => response.clone().text())
        )}`
    )
  }

  return response.json()
}

export async function getRequestStatus({
  verificationSessionId,
}: {
  verificationSessionId: string
}) {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/requests/${verificationSessionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get request status')
  }

  return response.json()
}

export async function receiveRequest(requestUri: string) {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/requests/receive`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({
      authorizationRequestUri: requestUri,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to receive request')
  }

  return response.json()
}
