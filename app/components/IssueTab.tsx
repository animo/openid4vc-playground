import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import Link from 'next/link'
import { type FormEvent, useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { createOffer, getIssuer, getX509Certificate } from '../lib/api'
import { X509Certificates } from './X509Certificates'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

export function IssueTab({ disabled = false }: { disabled?: boolean }) {
  const [credentialType, setCredentialType] = useState<string>()
  const [issuerId, setIssuerid] = useState<string>()
  const [credentialOfferUri, setCredentialOfferUri] = useState<string>()
  const [userPin, setUserPin] = useState<string>()
  const [issuer, setIssuer] = useState<{
    credentialsSupported: Array<{
      id: string
      display: string
    }>
    availableX509Certificates: string[]
  }>()

  useEffect(() => {
    getIssuer().then(setIssuer)
  }, [])

  async function onSubmitIssueCredential(e: FormEvent) {
    e.preventDefault()
    const _issuerId = issuerId ?? issuer?.availableX509Certificates[0]
    const _credentialType = credentialType ?? issuer?.credentialsSupported[0].id
    if (!_issuerId || !_credentialType) {
      throw new Error('No issuer or credential type')
    }

    const offer = await createOffer({
      credentialSupportedId: _credentialType,
      issuerId: _issuerId,
    })
    setCredentialOfferUri(offer.credentialOffer)
    setUserPin(offer.issuanceSession.userPin)
  }

  return (
    <Card className="p-6">
      <Alert variant="default" className="mb-5">
        <InfoCircledIcon className="h-4 w-4" />
        <AlertTitle>Info</AlertTitle>
        <AlertDescription>
          This playground was built in the context for the{' '}
          <a className="underline" href="https://www.sprind.org/en/challenges/eudi-wallet-prototypes/">
            EUDI Wallet Prototype Funke
          </a>
          . It is only compatible with the current deployed version of{' '}
          <a className="underline" href="https://github.com/animo/paradym-wallet/tree/main/apps/easypid">
            Animo&apos;s EUDI Wallet Prototype
          </a>
          .
        </AlertDescription>
      </Alert>
      <form className="space-y-4" onSubmit={disabled ? undefined : onSubmitIssueCredential}>
        <div className="space-y-2">
          <Label htmlFor="credential-type">Credential Type</Label>
          <Select name="credential-type" disabled={disabled} required onValueChange={setCredentialType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={!issuer ? 'Loading' : 'Select a credential type'} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {(issuer?.credentialsSupported ?? []).map((credential) => (
                  <SelectItem key={credential.id} value={credential.id}>
                    {credential.display}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="issuer-did">Issuer Id</Label>
          <Select name="issuer-did" disabled={disabled} required onValueChange={setIssuerid}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={!issuer ? 'Loading' : 'Select an issuer id'} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {(issuer?.availableX509Certificates ?? []).map((availableX509Certificate) => {
                  return (
                    <SelectItem key={availableX509Certificate} value={availableX509Certificate}>
                      {availableX509Certificate}
                    </SelectItem>
                  )
                }) ?? null}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-center items-center bg-gray-200 min-h-64 w-full rounded-md">
          {credentialOfferUri ? (
            <TooltipProvider>
              <Tooltip>
                <div className="flex flex-col p-5 gap-2 justify-center items-center gap-6">
                  <div className="bg-white p-5 rounded-md w-[296px]">
                    <QRCode size={256} value={credentialOfferUri} />
                  </div>
                  <TooltipTrigger asChild>
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                    <p
                      onClick={(e) => navigator.clipboard.writeText(e.currentTarget.innerText)}
                      className="text-gray-500 break-all cursor-pointer"
                    >
                      {credentialOfferUri}
                    </p>
                  </TooltipTrigger>
                  <div className="gap-2 w-full justify-center flex flex-1">
                    <div>
                      <Link href={credentialOfferUri}>
                        <Button>Open in Wallet</Button>
                      </Link>
                    </div>
                    <div>
                      <Link
                        href={credentialOfferUri.replace(
                          'openid-credential-offer://',
                          'https://funke.animo.id/invitation'
                        )}
                      >
                        <Button>Open in EasyPID Wallet</Button>
                      </Link>
                    </div>
                  </div>
                  {userPin && (
                    <div>
                      <strong>Transaction Code: </strong>
                      {userPin}
                    </div>
                  )}
                </div>

                <TooltipContent>
                  <p>Click to copy</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <p className="text-gray-500 break-all">Credential offer will be displayed here</p>
          )}
        </div>
        <Button
          onClick={onSubmitIssueCredential}
          disabled={disabled}
          className="w-full"
          onSubmit={onSubmitIssueCredential}
        >
          Issue Credential
        </Button>
        <X509Certificates />
      </form>
    </Card>
  )
}
