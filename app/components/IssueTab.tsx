import { CheckboxIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import type { ReadonlyURLSearchParams } from 'next/navigation'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useInterval } from '@/lib/hooks'
import { createOffer, getIssuers, getOfferStatus, type Issuers, type OfferStatus } from '../lib/api'
import { Field, SwitchField } from './Field'
import { PlaygroundAlert } from './PlaygroundAlert'
import { TabHeader } from './TabHeader'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { CredentialCardRadioItem, MiniRadioItem, RadioGroup } from './ui/radio'
import { WalletLinkPanel } from './WalletLinkPanel'
import { X509Certificates } from './X509Certificates'

const credentialFormatMap = {
  'dc+sd-jwt': 'SD-JWT VC (dc+sd-jwt)',
  mso_mdoc: 'mDOC',
}

const credentialFormatTags = {
  'dc+sd-jwt': 'SD-JWT VC',
  mso_mdoc: 'mDOC',
}

type Issuer = Issuers[number]

/** The issuer's listed credentials, where credentials with the same name are variants of one card. */
function getCredentialCards(issuer: Issuer) {
  const cards: Array<{ name: string; indexes: number[] }> = []
  issuer.credentials.forEach((credential, index) => {
    if (credential.hidden) return
    const card = cards.find((card) => card.name === credential.name)
    if (card) card.indexes.push(index)
    else cards.push({ name: credential.name, indexes: [index] })
  })
  return cards
}

const credentialCategories = [
  { id: 'government', title: 'Government documents' },
  { id: 'payments', title: 'Payments' },
] as const

function getOfferProgress({ state, presentation }: OfferStatus) {
  if (state === 'Completed') return 'Credential has been issued.'
  if (state === 'Error' || presentation?.state === 'Error') return 'Credential has not been issued.'
  if (state === 'CredentialRequestReceived' || state === 'CredentialsPartiallyIssued') {
    return 'Credential request has been received. Waiting for the credential to be issued...'
  }
  if (presentation?.state === 'ResponseVerified') {
    return 'Presentation has been verified. Waiting for the wallet to request the credential...'
  }
  if (presentation?.verificationSessionId) {
    return 'Presentation has been requested. Waiting for the wallet to share the credential...'
  }
  return 'Credential offer has been retrieved. Waiting for the wallet to request the credential...'
}

export function IssueTab({
  disabled = false,
  searchParams,
  active,
}: {
  disabled?: boolean
  searchParams: ReadonlyURLSearchParams
  active: boolean
}) {
  const [credentialType, setCredentialType] = useState<number>(0)
  const [selectedIssuerId, setSelectedIssuerId] = useState<string>()
  const [issuers, setIssuers] = useState<Issuers>()
  const [selectedFormat, setSelectedFormat] = useState<string>()
  const [requireKeyAttestation, setRequireKeyAttestation] = useState<boolean>(false)
  const [requireWalletAttestation, setRequireWalletAttestation] = useState<boolean>(false)

  const [selectedAuthorization, setSelectedAuthorization] = useState<string>('none')
  const [selectedDeferBy, setDeferBy] = useState<string>('none')

  const [credentialOfferUri, setCredentialOfferUri] = useState<string>()
  const [userPin, setUserPin] = useState<string>()
  const [issuanceSessionId, setIssuanceSessionId] = useState<string>()
  const [offerStatus, setOfferStatus] = useState<OfferStatus>()
  const [offerError, setOfferError] = useState<string>()

  const isIssued = offerStatus?.state === 'Completed'
  const presentationFailed = offerStatus?.presentation?.state === 'Error'
  const issuanceFailed = offerStatus?.state === 'Error'
  const offerHasBeenRetrieved = offerStatus !== undefined && offerStatus.state !== 'OfferCreated'

  const selectedIssuer = issuers?.find((i) => i.id === selectedIssuerId)
  const selectedVariants =
    (selectedIssuer &&
      getCredentialCards(selectedIssuer).find((card) => card.indexes.includes(credentialType))?.indexes) ??
    []
  const issueButtonRef = useRef<HTMLButtonElement>(null)
  const hasScrolledToIssueRef = useRef(false)

  const selectCredential = (issuerId: string, index: number) => {
    const credential = issuers?.find((i) => i.id === issuerId)?.credentials[index]
    setSelectedIssuerId(issuerId)
    setCredentialType(index)
    if (!selectedFormat || !credential?.formats[selectedFormat]) {
      setSelectedFormat(Object.keys(credential?.formats ?? {})[0])
    }
  }

  useEffect(() => {
    if (issuers) return

    const query = Object.fromEntries(searchParams.entries())

    getIssuers().then((i) => {
      setIssuers(i)

      // A link can name a credential that is no longer listed
      const linked = i.find((issuer) => issuer.id === query.issuerId)?.credentials[Number(query.credentialType ?? 0)]
      const isListed = linked !== undefined && !linked.hidden
      const issuerId = isListed ? query.issuerId : i[0].id
      const credentialType = isListed ? Number(query.credentialType ?? 0) : 0

      setSelectedIssuerId(issuerId)
      setCredentialType(credentialType)
      setSelectedFormat(
        query.format ?? Object.keys(i.find((i) => i.id === issuerId)?.credentials[credentialType]?.formats ?? {})[0]
      )
      if (query.authorization) setSelectedAuthorization(query.authorization)
      if (query.deferBy) setDeferBy(query.deferBy)
      if (query.walletAttestation) setRequireWalletAttestation(query.walletAttestation === 'true')
      if (query.keyAttestation) setRequireKeyAttestation(query.keyAttestation === 'true')
    })
  }, [issuers, searchParams])

  // Scroll to the Issue Credential button when opened via a shared config link
  useEffect(() => {
    if (!issuers || hasScrolledToIssueRef.current || !searchParams.get('scrollToIssue')) return
    hasScrolledToIssueRef.current = true
    issueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [issuers, searchParams])

  useInterval({
    callback: async () => {
      if (!issuanceSessionId) return

      const offerStatus = await getOfferStatus({ issuanceSessionId })
      setOfferStatus(offerStatus)
    },
    interval: 500,
    enabled: issuanceSessionId !== undefined && !isIssued && !presentationFailed && !issuanceFailed,
  })

  // Update URL when state changes
  useEffect(() => {
    if (!issuers || !active) return
    const params = new URLSearchParams()

    params.set('tab', 'issue')
    if (selectedIssuerId) params.set('issuerId', selectedIssuerId)
    if (selectedFormat) params.set('format', selectedFormat)
    if (selectedAuthorization) params.set('authorization', selectedAuthorization)
    if (selectedDeferBy) params.set('deferBy', selectedDeferBy)
    params.set('keyAttestation', `${requireKeyAttestation}`)
    params.set('walletAttestation', `${requireWalletAttestation}`)
    if (credentialType !== undefined) params.set('credentialType', `${credentialType}`)

    const existingSearchParams = new URLSearchParams(searchParams.toString())

    // Sort both for comparison
    existingSearchParams.sort()
    params.sort()

    if (existingSearchParams.toString() === params.toString()) return

    // Unlike router.replace, this doesn't trigger a server round-trip
    window.history.replaceState(null, '', `?${params.toString()}`)
  }, [
    issuers,
    selectedIssuerId,
    selectedFormat,
    selectedAuthorization,
    selectedDeferBy,
    credentialType,
    searchParams,
    active,
    requireKeyAttestation,
    requireWalletAttestation,
  ])

  async function onSubmitIssueCredential(e: FormEvent) {
    e.preventDefault()
    const formats = selectedIssuer?.credentials[credentialType].formats ?? {}
    const credentialSupportedId = selectedFormat ? formats[selectedFormat] : Object.values(formats)[0]
    if (!credentialSupportedId) {
      throw new Error('No credential type')
    }

    setIssuanceSessionId(undefined)
    setOfferStatus(undefined)
    setOfferError(undefined)
    let offer: Awaited<ReturnType<typeof createOffer>>
    try {
      offer = await createOffer({
        credentialSupportedId,
        authorization: selectedAuthorization,
        deferBy: selectedDeferBy,
        requireKeyAttestation,
        requireWalletAttestation,
      })
    } catch (error) {
      setCredentialOfferUri(undefined)
      setOfferError(error instanceof Error ? error.message : 'Unknown error occurred')
      return
    }
    setCredentialOfferUri(offer.credentialOffer)
    setUserPin(offer.issuanceSession.userPin)
    setIssuanceSessionId(offer.issuanceSession.id)
  }

  return (
    <Card className="p-4 sm:p-6">
      <PlaygroundAlert />
      <TabHeader title="Issue" />

      <form className="space-y-8" onSubmit={disabled ? undefined : onSubmitIssueCredential}>
        <RadioGroup
          className="grid gap-6"
          aria-label="Credential"
          value={`${selectedIssuerId}/${selectedVariants[0] ?? credentialType}`}
          onValueChange={(value) => {
            const [issuerId, index] = value.split('/')
            selectCredential(issuerId, Number(index))
          }}
        >
          {credentialCategories.map((category) => (
            <section key={category.id} className="flex flex-col gap-3">
              <h4 className="text-sm font-medium text-gray-900">{category.title}</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                {issuers
                  ?.filter((issuer) => issuer.category === category.id)
                  .flatMap((issuer) =>
                    getCredentialCards(issuer).map(({ name, indexes }) => {
                      // The card shows the selected variant
                      const { display } =
                        issuer.credentials[
                          issuer.id === selectedIssuerId && indexes.includes(credentialType)
                            ? credentialType
                            : indexes[0]
                        ]
                      const formats = new Set(
                        indexes.flatMap((index) => Object.keys(issuer.credentials[index].formats))
                      )

                      return (
                        <CredentialCardRadioItem
                          key={`${issuer.id}/${indexes[0]}`}
                          value={`${issuer.id}/${indexes[0]}`}
                          id={`radio-${issuer.id}-${indexes[0]}`}
                          credential={{
                            name,
                            background_color: display.background_color,
                            background_image: display.background_image?.uri,
                            text_color: display.text_color,
                          }}
                          issuer={issuer}
                          tags={[
                            ...indexes.flatMap((index) => issuer.credentials[index].variant ?? []),
                            ...[...formats].map(
                              (format) => credentialFormatTags[format as keyof typeof credentialFormatTags]
                            ),
                          ]}
                        />
                      )
                    })
                  )}
              </div>
            </section>
          ))}
        </RadioGroup>

        <div className="space-y-6 border-gray-200 border-t pt-8">
          {selectedIssuerId && selectedVariants.length > 1 && (
            <Field label="Specification" description="The specification the credential is issued under.">
              <RadioGroup
                name="specification"
                className="gap-x-5 gap-y-2"
                value={String(credentialType)}
                onValueChange={(value) => selectCredential(selectedIssuerId, Number(value))}
              >
                {selectedVariants.map((index) => (
                  <MiniRadioItem
                    key={index}
                    value={String(index)}
                    label={selectedIssuer?.credentials[index].variant ?? ''}
                  />
                ))}
              </RadioGroup>
            </Field>
          )}
          <Field
            label="Credential Format"
            description="Not all formats are defined by all rulebooks, consult the rulebook for supported formats specific to your use case."
          >
            <RadioGroup
              name="format"
              required
              value={selectedFormat}
              className="gap-x-5 gap-y-2"
              onValueChange={(value) => value !== '' && setSelectedFormat(value as 'dc+sd-jwt')}
            >
              {Object.keys(selectedIssuer?.credentials[credentialType]?.formats ?? {}).map((format) => (
                <MiniRadioItem
                  key={format}
                  value={format}
                  label={credentialFormatMap[format as keyof typeof credentialFormatMap]}
                />
              ))}
            </RadioGroup>
          </Field>

          <Field
            label="Authentication"
            description="Choose whether the user has to authenticate before receiving the credential."
          >
            <RadioGroup
              name="authorization"
              required
              className="gap-x-5 gap-y-2"
              onValueChange={setSelectedAuthorization}
              value={selectedAuthorization}
            >
              <MiniRadioItem value="none" label="None" />
              <MiniRadioItem value="presentation" label="Presentation during issuance" />
              <MiniRadioItem value="browser" label="Sign in" />
              <MiniRadioItem value="pin" label="Transaction code" />
            </RadioGroup>
            {selectedAuthorization === 'presentation' && (
              <p className="text-gray-500 text-sm">
                You first need to obtain the credential that will be presented during issuance. The configuration is
                already selected for you.{' '}
                <a
                  href="/?authorization=presentation&credentialType=1&deferBy=none&format=dc%2Bsd-jwt&issuerId=b39e71cf-9cf1-4723-a9cd-66f42a510b36&keyAttestation=false&tab=issue&walletAttestation=false&scrollToIssue=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-900 underline underline-offset-2"
                >
                  Issue that credential here.
                </a>
              </p>
            )}
          </Field>

          <Field label="Deferral" description="Choose whether to defer the credential issuance.">
            <RadioGroup
              name="deferral"
              required
              className="gap-x-5 gap-y-2"
              onValueChange={setDeferBy}
              value={selectedDeferBy}
            >
              <MiniRadioItem value="none" label="None" />
              <MiniRadioItem value="1m" label="1 Minute" />
              <MiniRadioItem value="1h" label="1 Hour" />
              <MiniRadioItem value="1d" label="1 Day" />
            </RadioGroup>
          </Field>

          <div className="space-y-4">
            <SwitchField
              id="require-wallet-attestation"
              label="Require Wallet Attestation"
              checked={requireWalletAttestation}
              onCheckedChange={setRequireWalletAttestation}
            />
            <SwitchField
              id="require-key-attestation"
              label="Require Key Attestation"
              checked={requireKeyAttestation}
              onCheckedChange={setRequireKeyAttestation}
            />
          </div>
        </div>

        <div className="space-y-4 border-gray-200 border-t pt-8">
          <Button ref={issueButtonRef} type="submit" disabled={disabled} className="w-full">
            Issue Credential
          </Button>
          <WalletLinkPanel
            uri={credentialOfferUri}
            paradymUri={credentialOfferUri?.replace('openid-credential-offer://', 'id.animo.paradym:')}
            status={offerStatus && offerHasBeenRetrieved ? getOfferProgress(offerStatus) : undefined}
            placeholder="The credential offer will appear here."
          >
            {userPin && (
              <p className="text-gray-900">
                Transaction code: <span className="font-medium font-mono">{userPin}</span>
              </p>
            )}
          </WalletLinkPanel>
          {offerError && (
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertTitle>Error creating offer</AlertTitle>
              <AlertDescription className="mt-2">{offerError}</AlertDescription>
            </Alert>
          )}
          {(isIssued || presentationFailed || issuanceFailed) && (
            <Alert variant={isIssued ? 'success' : 'warning'}>
              {isIssued ? <CheckboxIcon className="h-5 w-5" /> : <ExclamationTriangleIcon className="h-4 w-4" />}
              <AlertTitle className={isIssued ? 'mt-0.5' : ''}>
                {isIssued
                  ? 'Credential Issued'
                  : presentationFailed
                    ? 'Presentation Unsuccessful'
                    : 'Issuance Unsuccessful'}
              </AlertTitle>
              {!isIssued && (
                <AlertDescription className="mt-2">
                  {(presentationFailed ? offerStatus?.presentation?.error : offerStatus?.error) ??
                    'Unknown error occurred'}
                </AlertDescription>
              )}
            </Alert>
          )}
        </div>

        <X509Certificates />
      </form>
    </Card>
  )
}
