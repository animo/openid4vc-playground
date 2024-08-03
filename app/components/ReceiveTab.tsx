import { HighLight } from '@/components/highLight'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { type FormEvent, useState } from 'react'
import { receiveOffer, receiveRequest } from '../lib/api'

export function ReceiveTab() {
  const [receiveCredentialOfferOrPresentationUri, setReceiveCredentialOfferUri] = useState<string>()
  const [receivedCredentials, setReceivedCredentials] = useState()
  const [receivedPresentation, setReceivedPresentation] = useState()

  async function onSubmitReceiveOffer(e: FormEvent) {
    e.preventDefault()
    if (!receiveCredentialOfferOrPresentationUri) return
    if (receiveCredentialOfferOrPresentationUri.startsWith('openid-credential-offer://')) {
      setReceivedCredentials(await receiveOffer(receiveCredentialOfferOrPresentationUri))
    } else {
      setReceivedPresentation(await receiveRequest(receiveCredentialOfferOrPresentationUri))
    }
  }

  return (
    <Card className="p-6">
      <form className="space-y-4" onSubmit={onSubmitReceiveOffer}>
        <div className="space-y-2">
          <Label htmlFor="credential-offer-uri">Credential Offer or SIOP URI</Label>
          <textarea
            className="w-full h-20 p-2 rounded-md bg-white border border-gray-300"
            id="credential-offer-uri"
            required
            onChange={(e) => setReceiveCredentialOfferUri(e.currentTarget.value)}
          />
        </div>
        <div className="flex justify-center items-center bg-gray-200 min-h-64 w-full rounded-md">
          {receivedCredentials ? (
            <HighLight code={JSON.stringify(receivedCredentials, null, 2)} language="json" />
          ) : receivedPresentation ? (
            <HighLight code={JSON.stringify(receivedPresentation, null, 2)} language="json" />
          ) : (
            <p className="text-gray-500">JSON content of the credential will be displayed here</p>
          )}
        </div>
        <Button className="w-full" onClick={onSubmitReceiveOffer} onSubmit={onSubmitReceiveOffer}>
          Receive Credential
        </Button>
      </form>
    </Card>
  )
}
