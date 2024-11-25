import { NEXT_PUBLIC_API_URL } from './constants'

export async function createOffer({
  credentialSupportedId,
  issuerId,
}: {
  credentialSupportedId: string
  issuerId: string
}) {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/offers/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      credentialSupportedIds: [credentialSupportedId],
      issuerId,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create offer')
  }

  return (await response.json()) as { credentialOffer: string; issuanceSession: { userPin?: string } }
}

export async function getVerifier() {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/verifier`)

  if (!response.ok) {
    throw new Error('Failed to get verifier')
  }

  return response.json()
}

export async function getIssuer() {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/issuer`)

  if (!response.ok) {
    throw new Error('Failed to get issuer')
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

export async function createRequest({
  presentationDefinitionId,
  requestScheme,
  responseMode,
}: {
  presentationDefinitionId: string
  requestScheme: string
  responseMode: 'direct_post' | 'direct_post.jwt'
}) {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/requests/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      presentationDefinitionId,
      requestScheme,
      responseMode,
    }),
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
