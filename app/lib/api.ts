import { NEXT_PUBLIC_API_URL } from "./constants";

export const getQrUrl = (uri: string) =>
  `https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(
    uri
  )}&choe=UTF-8`;

export async function createOffer({
  credentialSupportedId,
  issuerDid,
}: {
  credentialSupportedId: string;
  issuerDid: string;
}) {
  const response = await fetch(NEXT_PUBLIC_API_URL + "/api/offers/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      credentialSupportedIds: [credentialSupportedId],
      issuerDid,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create offer");
  }

  return response.json();
}

export async function getIssuer() {
  const response = await fetch(NEXT_PUBLIC_API_URL + "/api/issuer");

  if (!response.ok) {
    throw new Error("Failed to get issuer");
  }

  return response.json();
}

export async function receiveOffer(offerUri: string) {
  const response = await fetch(NEXT_PUBLIC_API_URL + "/api/offers/receive", {
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      credentialOfferUri: offerUri,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to receive offer");
  }

  return response.json();
}
