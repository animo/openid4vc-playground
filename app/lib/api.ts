import { NEXT_PUBLIC_API_URL } from './constants'

export type CreateOfferReturn = { credentialOffer: string; issuanceSession: { userPin?: string } }
export async function createOffer({
  credentialSupportedId,
  authorization,
}: {
  credentialSupportedId: string
  authorization: string
}): Promise<CreateOfferReturn> {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/offers/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      credentialSupportedIds: [credentialSupportedId],
      authorization,
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
  requestSignerType: 'x5c' | 'openid-federation'
  presentationDefinitionId: string
  requestScheme: string
  responseMode: 'direct_post' | 'direct_post.jwt'
  purpose?: string
}) {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/requests/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to create request')
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
