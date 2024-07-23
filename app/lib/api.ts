import { NEXT_PUBLIC_API_URL } from './constants'

export async function createOffer({
  credentialSupportedId,
  issuerDidMethod,
}: {
  credentialSupportedId: string
  issuerDidMethod: string
}) {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/offers/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      credentialSupportedIds: [credentialSupportedId],
      issuerDidMethod,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create offer')
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
  presentationDefinition,
}: {
  presentationDefinition: any
}) {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/requests/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      presentationDefinition,
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
