import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CheckIcon, CopyIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import { RadioGroup } from '@radix-ui/react-radio-group'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { type Issuers, createOffer, getIssuers } from '../lib/api'
import { X509Certificates } from './X509Certificates'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { CardRadioItem, CredentialCardRadioItem, MiniRadioItem } from './ui/radio'
import { Switch } from './ui/switch'
import { TypographyH3 } from './ui/typography'

const credentialFormatMap = {
  'vc+sd-jwt': 'SD-JWT VC (vc+sd-jwt)',
  'dc+sd-jwt': 'SD-JWT VC (dc+sd-jwt)',
  mso_mdoc: 'mDOC',
  ldp_vc: 'W3C 1.1 JSON-LD',
}

export function IssueTab({ disabled = false }: { disabled?: boolean }) {
  const [credentialType, setCredentialType] = useState<number>(0)
  const [selectedIssuerId, setSelectedIssuerId] = useState<string>()
  const [issuers, setIssuers] = useState<Issuers>()
  const [selectedFormat, setSelectedFormat] = useState<string>()
  const [requireKeyAttestation, setRequireKeyAttestation] = useState<boolean>(false)
  const [requireWalletAttestation, setRequireWalletAttestation] = useState<boolean>(false)
  const [requireDpop, setRequireDpop] = useState<boolean>(false)

  const [selectedAuthorization, setSelectedAuthorization] = useState<string>('none')
  const [selectedDeferBy, setDeferBy] = useState<string>('none')

  const [credentialOfferUri, setCredentialOfferUri] = useState<string>()
  const [userPin, setUserPin] = useState<string>()

  const selectedIssuer = issuers?.find((i) => i.id === selectedIssuerId)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isCopyingTimeout, setIsCopyingTimeout] = useState<ReturnType<typeof setTimeout>>()
  const copyConfigurationText = isCopyingTimeout ? 'Configuration copied!' : 'Copy configuration'

  useEffect(() => {
    if (issuers) return

    const query = Object.fromEntries(searchParams.entries())

    getIssuers().then((i) => {
      setIssuers(i)

      const issuerId = query.issuerId ?? i[0].id
      const credentialType = query.issuerId && query.credentialType ? Number(query.credentialType) : 0

      setSelectedIssuerId(issuerId)
      setCredentialType(credentialType)
      setSelectedFormat(
        query.format ?? Object.keys(i.find((i) => i.id === issuerId)?.credentials[credentialType]?.formats ?? {})[0]
      )
      if (query.authorization) setSelectedAuthorization(query.authorization)
      if (query.deferBy) setDeferBy(query.deferBy)
      if (query.dpop) setRequireDpop(query.dpop === 'true')
      if (query.walletAttestation) setRequireWalletAttestation(query.walletAttestation === 'true')
      if (query.keyAttestation) setRequireKeyAttestation(query.keyAttestation === 'true')
    })
  }, [issuers, searchParams])

  // Update URL when state changes
  useEffect(() => {
    if (!issuers) return
    const params = new URLSearchParams()

    params.set('tab', 'issue')
    if (selectedIssuerId) params.set('issuerId', selectedIssuerId)
    if (selectedFormat) params.set('format', selectedFormat)
    if (selectedAuthorization) params.set('authorization', selectedAuthorization)
    if (selectedDeferBy) params.set('deferBy', selectedDeferBy)
    params.set('dpop', `${requireDpop}`)
    params.set('keyAttestation', `${requireKeyAttestation}`)
    params.set('walletAttestation', `${requireWalletAttestation}`)
    if (credentialType !== undefined) params.set('credentialType', `${credentialType}`)

    const existingSearchParams = new URLSearchParams(searchParams.toString())

    // Sort both for comparison
    existingSearchParams.sort()
    params.sort()

    if (existingSearchParams.toString() === params.toString()) return

    router.replace(`?${params.toString()}`, { scroll: false })
  }, [
    issuers,
    selectedIssuerId,
    selectedFormat,
    selectedAuthorization,
    selectedDeferBy,
    credentialType,
    router,
    searchParams,
    requireDpop,
    requireKeyAttestation,
    requireWalletAttestation,
  ])

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
      deferBy: selectedDeferBy,
      requireDpop,
      requireKeyAttestation,
      requireWalletAttestation,
    })
    setCredentialOfferUri(offer.credentialOffer)
    setUserPin(offer.issuanceSession.userPin)
  }

  const copyConfiguration = async () => {
    if (isCopyingTimeout) {
      clearTimeout(isCopyingTimeout)
    }
    const currentUrl = window.location.href
    await navigator.clipboard.writeText(currentUrl)

    const timeout = setTimeout(() => setIsCopyingTimeout(undefined), 3000)
    setIsCopyingTimeout(timeout)
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
      <div className="flex justify-between items-center mb-4">
        <TypographyH3>Issue</TypographyH3>
        <Button variant="link" size="sm" onClick={copyConfiguration} className="flex items-center gap-2">
          {isCopyingTimeout ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
          {copyConfigurationText}
        </Button>
      </div>

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
        <div className="space-y-2">
          <div>
            <Label htmlFor="format">Deferral</Label>
            <p className="text-gray-500 text-sm">Choose whether to defer the credential issuance.</p>
          </div>

          <RadioGroup
            name="authorization"
            required
            className="flex flex-col gap-2 md:gap-4 md:flex-row"
            onValueChange={(v) => {
              setDeferBy(v)
            }}
            value={selectedDeferBy}
          >
            <MiniRadioItem value="none" label="None" />
            <MiniRadioItem value="1h" label="1 Hour" />
            <MiniRadioItem value="1d" label="1 Day" />
            <MiniRadioItem value="1w" label="1 Week" />
          </RadioGroup>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="require-dpop">Require DPoP</Label>
          <Switch
            id="require-dpop"
            name="require-dpop"
            required
            checked={requireDpop}
            onCheckedChange={setRequireDpop}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="require-wallet-attestation">Require Wallet Attestation</Label>
          <Switch
            id="require-wallet-attestation"
            name="require-wallet-attestation"
            required
            checked={requireWalletAttestation}
            onCheckedChange={setRequireWalletAttestation}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="require-key-attestation">Require Key Attestation</Label>
          <Switch
            id="require-key-attestation"
            name="require-key-attestation"
            required
            checked={requireKeyAttestation}
            onCheckedChange={setRequireKeyAttestation}
          />
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
