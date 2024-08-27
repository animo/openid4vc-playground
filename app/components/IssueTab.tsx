import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { type FormEvent, useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { createOffer, getIssuer, getX509Certificate } from '../lib/api'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

export function IssueTab({ disabled = false }: { disabled?: boolean }) {
  const [x509Certificate, setX509Certificate] = useState<string>()
  const [credentialType, setCredentialType] = useState<string>()
  const [issuerId, setIssuerid] = useState<string>()
  const [credentialOfferUri, setCredentialOfferUri] = useState<string>()
  const [issuer, setIssuer] = useState<{
    credentialsSupported: Array<{
      id: string
      display: string
    }>
    availableX509Certificates: string[]
    display: {}
  }>()

  useEffect(() => {
    getIssuer().then(setIssuer)
    getX509Certificate().then(({ certificate }) => setX509Certificate(certificate))
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
            Animo's EUDI Wallet Prototype
          </a>{' '}
          are disabled for public use.
        </AlertDescription>
      </Alert>
      <form className="space-y-4" onSubmit={disabled ? undefined : onSubmitIssueCredential}>
        <div className="space-y-2">
          <Label htmlFor="credential-type">Credential Type</Label>
          <Select name="credential-type" disabled={disabled} required onValueChange={setCredentialType}>
            <SelectTrigger className="w-[320px]">
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
            <SelectTrigger className="w-[320px]">
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
                    <p
                      onClick={(e) => navigator.clipboard.writeText(e.currentTarget.innerText)}
                      className="text-gray-500 break-all cursor-pointer"
                    >
                      {credentialOfferUri}
                    </p>
                  </TooltipTrigger>
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
        <div className="flex justify-center flex-col items-center bg-gray-200 min-h-64 w-full rounded-md p-7">
          <h3>X.509 Certificate in base64 format</h3>
          <TooltipProvider>
            <Tooltip>
              <div className="flex flex-col p-5 gap-2 justify-center items-center gap-6">
                <TooltipTrigger asChild>
                  <p
                    onClick={(e) => navigator.clipboard.writeText(e.currentTarget.innerText)}
                    className="text-gray-500 break-all cursor-pointer"
                  >
                    {x509Certificate ?? 'No X.509 Certificate found'}
                  </p>
                </TooltipTrigger>
              </div>

              <TooltipContent>
                <p>Click to copy</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </form>
    </Card>
  )
}
