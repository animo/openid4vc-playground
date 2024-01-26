import { FormEvent, useState } from "react";
import { receiveOffer } from "../lib/api";
import { Label } from "@/components/ui/label";
import { HighLight } from "@/components/highLight";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ReceiveTab() {
  const [receiveCredentialOfferUri, setReceiveCredentialOfferUri] =
    useState<string>();
  const [receivedCredentials, setReceivedCredentials] = useState();

  async function onSubmitReceiveOffer(e: FormEvent) {
    e.preventDefault();
    if (!receiveCredentialOfferUri) return;

    setReceivedCredentials(await receiveOffer(receiveCredentialOfferUri));
  }

  return (
    <Card className="p-6">
      <form className="space-y-4" onSubmit={onSubmitReceiveOffer}>
        <div className="space-y-2">
          <Label htmlFor="credential-offer-uri">Credential Offer URI</Label>
          <textarea
            className="w-full h-20 p-2 rounded-md bg-white border border-gray-300"
            id="credential-offer-uri"
            required
            onChange={(e) =>
              setReceiveCredentialOfferUri(e.currentTarget.value)
            }
          />
        </div>
        <div className="flex justify-center items-center bg-gray-200 min-h-64 w-full rounded-md">
          {receivedCredentials ? (
            <HighLight
              code={JSON.stringify(receivedCredentials, null, 2)}
              language="json"
            />
          ) : (
            <p className="text-gray-500">
              JSON content of the credential will be displayed here
            </p>
          )}
        </div>
        <Button
          className="w-full"
          onClick={onSubmitReceiveOffer}
          onSubmit={onSubmitReceiveOffer}
        >
          Receive Credential
        </Button>
      </form>
    </Card>
  );
}
