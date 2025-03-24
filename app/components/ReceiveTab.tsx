import { HighLight } from '@/components/highLight'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { type FormEvent, useState } from 'react'
import { receiveOffer, receiveRequest } from '../lib/api'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

export function ReceiveTab({ disabled = false }: { disabled?: boolean }) {
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
      <Alert variant="warning" className="mb-5">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          This playground was built in the context for the{' '}
          <a className="underline" href="https://www.sprind.org/en/challenges/eudi-wallet-prototypes/">
            EUDI Wallet Prototype Funke
          </a>
          . Tabs that are not compatible with the current deployed version of{' '}
          <a className="underline" href="https://github.com/animo/paradym-wallet/tree/main/apps/easypid">
            Animo&apos;s EUDI Wallet Prototype
          </a>{' '}
          are disabled for public use.
        </AlertDescription>
      </Alert>
      <form className="space-y-4" onSubmit={disabled ? undefined : onSubmitReceiveOffer}>
        <div className="space-y-2">
          <Label htmlFor="credential-offer-uri">Credential Offer or OpenID4VP URI</Label>
          <textarea
            disabled={disabled}
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
        <Button disabled={disabled} className="w-full" onClick={onSubmitReceiveOffer} onSubmit={onSubmitReceiveOffer}>
          Receive Credential
        </Button>
      </form>
    </Card>
  )
}
