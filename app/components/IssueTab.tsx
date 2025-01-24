import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { RadioGroup } from '@radix-ui/react-radio-group'
import Image from 'next/image'
import Link from 'next/link'
import { type FormEvent, useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { type Issuers, createOffer, getIssuers } from '../lib/api'
import { X509Certificates } from './X509Certificates'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { CardRadioItem, CredentialCardRadioItem, MiniRadioItem } from './ui/radio'

const credentialFormatMap = {
  'vc+sd-jwt': 'SD-JWT VC',
  mso_mdoc: 'mDOC',
}

export function IssueTab({ disabled = false }: { disabled?: boolean }) {
  const [credentialType, setCredentialType] = useState<number>(0)
  const [selectedIssuerId, setSelectedIssuerId] = useState<string>()
  const [issuers, setIssuers] = useState<Issuers>()
  const [selectedFormat, setSelectedFormat] = useState<string>()
  const [selectedAuthorization, setSelectedAuthorization] = useState<string>('none')

  const [credentialOfferUri, setCredentialOfferUri] = useState<string>()
  const [userPin, setUserPin] = useState<string>()

  const selectedIssuer = issuers?.find((i) => i.id === selectedIssuerId)

  useEffect(() => {
    getIssuers().then((i) => {
      setIssuers(i)
      setSelectedIssuerId(i[0].id)
      setCredentialType(0)
      setSelectedFormat(Object.keys(i[0].credentials[0]?.formats ?? {})[0])
    })
  }, [])

  async function onSubmitIssueCredential(e: FormEvent) {
    e.preventDefault()
    console.log(selectedIssuer, credentialType, selectedFormat, selectedAuthorization)
    const formats = selectedIssuer?.credentials[credentialType].formats ?? {}
    const credentialSupportedId = selectedFormat ? formats[selectedFormat] : Object.values(formats)[0]
    if (!credentialSupportedId) {
      throw new Error('No credential type')
    }

    const offer = await createOffer({
      credentialSupportedId,
      authorization: selectedAuthorization,
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
        <div className="flex flex-col">
          <div className="flex flex-col items-start gap-2">
            <span className="text-accent font-medium text-lg">Issuer</span>
          </div>
          <RadioGroup
            className="grid grid-cols-2 gap-2 py-2 pb-4"
            value={selectedIssuerId}
            onValueChange={(issuerId) => {
              const issuer = issuers?.find((i) => i.id === issuerId)
              const credential = issuer?.credentials[0]

              setSelectedIssuerId(issuerId)
              setCredentialType(0)
              if (!credential?.formats || !selectedFormat || !(selectedFormat in credential.formats)) {
                setSelectedFormat(Object.keys(credential?.formats ?? {})[0])
              }
            }}
          >
            {issuers?.map((issuer) => (
              <CardRadioItem
                key={issuer.id}
                value={issuer.id}
                id={`radio-${issuer.id}`}
                label={issuer.name}
                tags={issuer.tags}
                description={issuer.description}
                icon={
                  <Image
                    unoptimized
                    width={50}
                    height={50}
                    className="object-contain w-[50px] h-[50px]"
                    src={issuer.logo}
                    alt={`Logo of ${issuer.name}`}
                  />
                }
              />
            ))}
          </RadioGroup>
        </div>
        <div className="flex flex-col">
          <div className="flex flex-col items-start gap-2">
            <span className="text-accent font-medium text-lg">Credential</span>
          </div>
          <RadioGroup
            className="grid grid-cols-2 md:grid-cols-3 gap-2 py-2 pb-4"
            value={String(credentialType)}
            onValueChange={(credentialType) => {
              if (credentialType !== '') {
                setCredentialType(Number(credentialType))
                const credential = selectedIssuer?.credentials[Number(credentialType)]
                if (!selectedFormat || !credential?.formats?.[selectedFormat]) {
                  setSelectedFormat(Object.keys(credential?.formats ?? {})[0])
                }
              }
            }}
          >
            {selectedIssuer?.credentials.map((credential, index) => (
              <CredentialCardRadioItem
                key={String(index)}
                value={String(index)}
                id={`radio-${index}`}
                credential={{
                  name: credential.display.name,
                  background_color: credential.display.background_color,
                  background_image: credential.display.background_image.uri,
                  text_color: credential.display.text_color,
                }}
                issuer={selectedIssuer}
              />
            ))}
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <div>
            <Label htmlFor="format">Credential Format</Label>
            <p className="text-gray-500 text-sm">
              Not all formats are defined by all rulebooks, consult the rulebook for supported formats specific to your
              use case.
            </p>
          </div>

          <RadioGroup
            name="format"
            required
            value={selectedFormat}
            className="flex flex-row gap-4"
            onValueChange={(value) => value !== '' && setSelectedFormat(value as 'vc+sd-jwt')}
          >
            {Object.keys(selectedIssuer?.credentials[credentialType]?.formats ?? {}).map((format) => (
              <MiniRadioItem
                key={format}
                className="my-2"
                value={format}
                label={credentialFormatMap[format as keyof typeof credentialFormatMap]}
              />
            ))}
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <div>
            <Label htmlFor="format">Authentication</Label>
            <p className="text-gray-500 text-sm">
              Choose whether the user has to authenticate before receiving the credential.
            </p>
          </div>

          <RadioGroup
            name="authorization"
            required
            className="flex flex-col gap-2 md:gap-4 md:flex-row"
            onValueChange={(v) => {
              setSelectedAuthorization(v)
            }}
            value={selectedAuthorization}
          >
            <MiniRadioItem value="none" label="None" />
            <MiniRadioItem value="presentation" label="Presentation during issuance" />
            <MiniRadioItem value="browser" label="Sign in" />
            <MiniRadioItem value="pin" label="Transaction code" />
          </RadioGroup>
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
                      <Link href={credentialOfferUri.replace('openid-credential-offer://', 'id.animo.ausweis:')}>
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
