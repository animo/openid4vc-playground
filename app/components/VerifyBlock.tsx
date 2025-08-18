import { createRequest, getRequestStatus, getVerifier, verifyResponseDc } from '@/lib/api'
import { useInterval } from '@/lib/hooks'
import { CheckIcon, CheckboxIcon, CopyIcon, ExclamationTriangleIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip'
import { groupBy } from 'es-toolkit'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { CollapsibleSection } from './CollapsibleSection'
import { X509Certificates } from './X509Certificates'
import { HighLight } from './highLight'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { CardRadioItem, MiniRadioItem, RadioGroup } from './ui/radio'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { TypographyH3 } from './ui/typography'

export type CreateRequestOptions = Parameters<typeof createRequest>[0]
export type CreateRequestResponse = Awaited<ReturnType<typeof createRequest>>

export type ResponseMode = 'direct_post' | 'direct_post.jwt' | 'dc_api' | 'dc_api.jwt'
export type TransactionAuthorizationType = 'none' | 'qes'
type ResponseStatus = 'RequestCreated' | 'RequestUriRetrieved' | 'ResponseVerified' | 'Error'

type RequestSignerType = CreateRequestOptions['requestSignerType']
type Verifier = {
  presentationRequests: Array<{
    id: string
    display: string
    useCase: { name: string; icon: string; tags: Array<string> }
  }>
}

export const VerifyBlock: React.FC = () => {
  const [authorizationRequestUri, setAuthorizationRequestUri] = useState<string>()
  const [verificationSessionId, setVerificationSessionId] = useState<string>()
  const [requestStatus, setRequestStatus] = useState<{
    verificationSessionId: string
    responseStatus: ResponseStatus
    authorizationRequest: Record<string, unknown>
    error?: string
    submission?: Record<string, unknown>
    definition?: Record<string, unknown>
    dcqlQuery?: Record<string, unknown>
    transactionData?: Record<string, unknown>
    transactionDataSubmission?: Record<string, unknown>
    dcqlSubmission?: Record<string, unknown>
    presentations?: Array<string | Record<string, unknown>>
  }>()
  const [verifier, setVerifier] = useState<Verifier>()
  const [responseMode, setResponseMode] = useState<ResponseMode>('direct_post.jwt')
  const [transactionAuthorizationType, setTransactionAuthorizationType] = useState<TransactionAuthorizationType>('none')

  const enabled =
    verificationSessionId !== undefined &&
    requestStatus?.responseStatus !== 'ResponseVerified' &&
    requestStatus?.responseStatus !== 'Error'

  const authorizationRequestUriHasBeenFetched = requestStatus?.responseStatus === 'RequestUriRetrieved'
  const hasResponse = requestStatus?.responseStatus === 'ResponseVerified' || requestStatus?.responseStatus === 'Error'
  const isSuccess = requestStatus?.responseStatus === 'ResponseVerified'
  const [presentationDefinitionId, setPresentationDefinitionId] = useState<string>()
  const [requestScheme, setRequestScheme] = useState<string>('openid4vp://')
  const [purpose, setPurpose] = useState<string>()
  const [requestSignerType, setRequestSignerType] = useState<RequestSignerType>('x5c')
  const [requestError, setRequestError] = useState<string>()
  const [requestVersion, setRequestVersion] = useState<'v1.draft21' | 'v1.draft24' | 'v1'>('v1')
  const [queryLanguage, setQueryLanguage] = useState<'dcql' | 'pex'>('dcql')
  const searchParams = useSearchParams()
  const router = useRouter()

  const [isCopyingTimeout, setIsCopyingTimeout] = useState<ReturnType<typeof setTimeout>>()
  const copyConfigurationText = isCopyingTimeout ? 'Configuration copied!' : 'Copy configuration'

  // Update URL when state changes
  useEffect(() => {
    if (!verifier) return
    const params = new URLSearchParams()

    params.set('tab', 'verify')
    if (responseMode) params.set('responseMode', responseMode)
    if (transactionAuthorizationType) params.set('transactionAuthorizationType', transactionAuthorizationType)
    if (presentationDefinitionId) params.set('presentationDefinitionId', presentationDefinitionId)
    if (requestScheme) params.set('requestScheme', requestScheme)
    if (purpose) params.set('purpose', purpose)
    if (requestSignerType) params.set('requestSignerType', requestSignerType)
    if (requestVersion) params.set('requestVersion', requestVersion)
    if (queryLanguage) params.set('queryLanguage', queryLanguage)

    const existingSearchParams = new URLSearchParams(searchParams.toString())

    // Sort both for comparison
    existingSearchParams.sort()
    params.sort()

    if (existingSearchParams.toString() === params.toString()) return

    router.replace(`?${params.toString()}`, { scroll: false })
  }, [
    verifier,
    responseMode,
    transactionAuthorizationType,
    presentationDefinitionId,
    requestScheme,
    purpose,
    requestSignerType,
    requestVersion,
    queryLanguage,
    router,
    searchParams,
  ])

  useEffect(() => {
    if (verifier) return
    const query = Object.fromEntries(searchParams.entries())

    getVerifier().then((v: Verifier) => {
      setVerifier(v)

      if (query.responseMode) setResponseMode(query.responseMode as ResponseMode)
      if (query.transactionAuthorizationType)
        setTransactionAuthorizationType(query.transactionAuthorizationType as TransactionAuthorizationType)

      setPresentationDefinitionId(
        query.presentationDefinitionId ?? Object.values(groupBy(v.presentationRequests, (v) => v.useCase.name))[0][0].id
      )
      if (query.requestScheme) setRequestScheme(query.requestScheme as string)
      if (query.purpose) setPurpose(query.purpose as string)
      if (query.requestSignerType) setRequestSignerType(query.requestSignerType as RequestSignerType)
      if (query.requestVersion) setRequestVersion(query.requestVersion as 'v1.draft21' | 'v1.draft24' | 'v1')
      if (query.queryLanguage) setQueryLanguage(query.queryLanguage as 'dcql' | 'pex')
    })
  }, [searchParams, verifier])

  useInterval({
    callback: async () => {
      if (!verificationSessionId) return

      const requestStatus = await getRequestStatus({ verificationSessionId })
      setRequestStatus(requestStatus)
    },
    interval: 500,
    enabled,
  })

  const initiateDc = async (request: CreateRequestResponse) => {
    let credentialResponse: Credential | null | undefined = undefined

    try {
      credentialResponse = await navigator.credentials.get({
        // @ts-ignore
        digital: {
          requests: [
            {
              protocol: 'openid4vp',
              data: request.authorizationRequestObject,
            },
          ],
        },
      })
    } catch (error) {
      if (error instanceof TypeError) {
        console.error('Error triggering DC API with new strucutre', error)
      } else {
        setRequestStatus({
          ...request,
          responseStatus: 'Error',
          error: error instanceof Error ? error.message : 'Unknown error while calling Digital Credentials API',
        })
        return
      }
    }

    // Try legacy structure
    if (credentialResponse === undefined) {
      try {
        credentialResponse = await navigator.credentials.get({
          // @ts-ignore
          digital: {
            providers: [
              {
                protocol: 'openid4vp',
                request: request.authorizationRequestObject,
              },
            ],
          },
        })
      } catch (error) {
        if (error instanceof TypeError) {
          console.error('Error triggering DC API with legacy strucutre', error)
        } else {
          setRequestStatus({
            ...request,
            responseStatus: 'Error',
            error: error instanceof Error ? error.message : 'Unknown error while calling Digital Credentials API',
          })
          return
        }
      }
    }

    if (credentialResponse === undefined) {
      setRequestStatus({
        ...request,
        responseStatus: 'Error',
        error: 'An error occurred while requesting a credential using the Digital Credentials API',
      })
      return
    }

    if (!credentialResponse) {
      setRequestStatus({
        ...request,
        responseStatus: 'Error',
        error: 'Did not receive a response from Digital Credentials API',
      })
      return
    }
    if (credentialResponse.constructor.name === 'DigitalCredential') {
      // @ts-ignore
      const data = credentialResponse.data

      setRequestStatus(
        await verifyResponseDc({
          verificationSessionId: request.verificationSessionId,
          data,
        })
      )
      return
    }
    if (credentialResponse.constructor.name === 'IdentityCredential') {
      // @ts-ignore
      const data = credentialResponse.token

      setRequestStatus(
        await verifyResponseDc({
          verificationSessionId: request.verificationSessionId,
          data,
        })
      )
      return
    }
    setRequestStatus({
      ...request,
      responseStatus: 'Error',
      error: 'Unknown response type from Digital Credentials API',
    })
  }

  const onSubmitCreateRequest = async (e: FormEvent) => {
    e.preventDefault()

    // Clear state
    setAuthorizationRequestUri(undefined)
    setVerificationSessionId(undefined)
    setRequestStatus(undefined)
    setRequestError(undefined)

    const id = presentationDefinitionId ?? verifier?.presentationRequests[0]?.id
    if (!id) {
      throw new Error('No definition')
    }

    let request: CreateRequestResponse
    try {
      request = await createRequest({
        presentationDefinitionId: id,
        requestScheme,
        responseMode,
        purpose: purpose && purpose !== '' ? purpose : undefined,
        requestSignerType,
        transactionAuthorizationType,
        version: requestVersion,
        queryLanguage,
      })
      if (responseMode.includes('direct_post')) {
        setAuthorizationRequestUri(request.authorizationRequestUri)
      }
      setRequestStatus(request)
      setVerificationSessionId(request.verificationSessionId)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unknown error occured')
      return
    }

    if (responseMode.includes('dc_api')) {
      await initiateDc(request)
    }
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

  // This is wrong
  const groupedVerifier = verifier?.presentationRequests
    ? groupBy(verifier.presentationRequests, (v) => v.useCase.name)
    : {}

  const selectedUseCase =
    Object.entries(groupedVerifier).find(([, requests]) =>
      requests.find((r) => r.id === presentationDefinitionId)
    )?.[0] ?? Object.keys(groupedVerifier)[0]

  const isInteropOpenIdInteropEventUseCase = selectedUseCase === 'OpenID Foundation Interop Event April'

  useEffect(() => {
    if (!isInteropOpenIdInteropEventUseCase) return

    if (requestVersion !== 'v1.draft24') setRequestVersion('v1.draft24')
    if (requestSignerType === 'openid-federation') setRequestSignerType('x5c')
    if (queryLanguage !== 'dcql') setQueryLanguage('dcql')
    if (!responseMode.startsWith('dc_api')) setResponseMode('dc_api.jwt')
  }, [isInteropOpenIdInteropEventUseCase, requestVersion, requestSignerType, queryLanguage, responseMode])

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
        <TypographyH3>Verify</TypographyH3>
        <Button variant="link" size="sm" onClick={copyConfiguration} className="flex items-center gap-2">
          {isCopyingTimeout ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
          {copyConfigurationText}
        </Button>
      </div>
      <form className="space-y-8 mt-4" onSubmit={onSubmitCreateRequest}>
        <div className="flex flex-col">
          <div className="flex flex-col items-start gap-2">
            <span className="text-accent font-medium text-sm">Use Case</span>
          </div>
          <RadioGroup
            className="grid  grid-cols-1 sm:grid-cols-2 gap-2 py-2 pb-4"
            value={selectedUseCase}
            onValueChange={(useCase) => setPresentationDefinitionId(groupedVerifier[useCase][0].id)}
          >
            {Object.entries(groupedVerifier).map(([useCase]) => (
              <CardRadioItem
                key={useCase}
                value={useCase}
                id={`radio-${useCase}`}
                label={useCase}
                description={Array.from(new Set(groupedVerifier[useCase].flatMap((u) => u.useCase.tags))).join(', ')}
                icon={groupedVerifier[useCase][0].useCase.icon}
              />
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="presentation-type">Presentation Type</Label>
          <Select
            name="presentation-definition-id"
            required
            value={presentationDefinitionId}
            onValueChange={(value) => {
              if (value !== '') {
                setPresentationDefinitionId(value)
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a presentation type" />
            </SelectTrigger>
            <SelectContent>
              {selectedUseCase &&
                groupedVerifier[selectedUseCase]?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.display}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="request-draft-version">Request Draft Version</Label>

          <RadioGroup
            name="request-draft-version"
            required
            value={requestVersion}
            onValueChange={(value) => {
              setRequestVersion(value as 'v1.draft21' | 'v1.draft24' | 'v1')
              if (value === 'v1.draft21') {
                setResponseMode((r) => r.replace('dc_api', 'direct_post') as ResponseMode)
                setRequestSignerType((r) => (r === 'none' ? 'x5c' : r))
                setTransactionAuthorizationType('none')
                setQueryLanguage('pex')
              }
            }}
          >
            {!isInteropOpenIdInteropEventUseCase && (
              <MiniRadioItem key="v1.draft21" value="v1.draft21" label="Draft 21" />
            )}
            <MiniRadioItem key="v1.draft24" value="v1.draft24" label="Draft 24" />
            <MiniRadioItem key="v1" value="v1" label="Version 1" />
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label htmlFor="initiation-method">Initiation Method</Label>

          <RadioGroup
            name="initiation-method"
            required
            value={responseMode === 'dc_api' || responseMode === 'dc_api.jwt' ? 'dcApi' : 'qr'}
            onValueChange={(value) => {
              setResponseMode(
                `${value === 'qr' ? 'direct_post' : 'dc_api'}${responseMode.endsWith('.jwt') ? '.jwt' : ''}`
              )
              if (value === 'qr') {
                setRequestSignerType((s) => (s === 'none' ? 'x5c' : s))
              }
            }}
          >
            {!isInteropOpenIdInteropEventUseCase && <MiniRadioItem key="qr" value="qr" label="QR / Deeplink" />}
            {requestVersion !== 'v1.draft21' && (
              <MiniRadioItem key="dcApi" value="dcApi" label="Digital Credentials API" />
            )}
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label htmlFor="query-language">Query Language</Label>

          <RadioGroup
            name="query-language"
            required
            value={queryLanguage}
            onValueChange={(value) => setQueryLanguage(value as 'pex' | 'dcql')}
          >
            {!isInteropOpenIdInteropEventUseCase && requestVersion !== 'v1' && (
              <MiniRadioItem key="pex" value="pex" label="DIF Presentation Exchange" />
            )}
            {requestVersion !== 'v1.draft21' && <MiniRadioItem key="dcql" value="dcql" label="DCQL" />}
          </RadioGroup>
        </div>
        {responseMode.includes('direct_post') && (
          <div className="space-y-2">
            <Label htmlFor="request-scheme">Scheme (QR / Deeplink)</Label>
            <Input
              disabled={responseMode.includes('dc_api')}
              name="request-scheme"
              required
              value={requestScheme}
              onChange={({ target }) => setRequestScheme(target.value)}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="request-signer-type">Request Signer Type</Label>

          <RadioGroup
            name="request-signer-type"
            required
            value={requestSignerType}
            onValueChange={(value) => setRequestSignerType(value as RequestSignerType)}
            defaultValue="x5c"
          >
            <MiniRadioItem key="x5c" value="x5c" label="x509 Certificate" />
            {!isInteropOpenIdInteropEventUseCase && (
              <MiniRadioItem key="openid-federation" value="openid-federation" label="OpenID Federation" />
            )}
            {responseMode.includes('dc_api') && <MiniRadioItem key="none" value="none" label="None" />}
          </RadioGroup>
        </div>

        {requestVersion !== 'v1.draft21' && !isInteropOpenIdInteropEventUseCase && (
          <div className="space-y-2">
            <Label htmlFor="presentation-type">Transaction Authorization</Label>
            <Select
              name="transaction-data"
              required
              value={transactionAuthorizationType}
              onValueChange={(value) => setTransactionAuthorizationType(value as TransactionAuthorizationType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a transaction authorization type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="qes">Qualified Electronic Signature</SelectItem>
                <SelectItem value="payment" disabled>
                  Payment
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="response-mode">Use Response Encryption</Label>
          <Switch
            id="response-mode"
            name="response-mode"
            required
            checked={responseMode === 'direct_post.jwt' || responseMode === 'dc_api.jwt'}
            onCheckedChange={(checked) =>
              setResponseMode(
                checked
                  ? responseMode.endsWith('.jwt')
                    ? responseMode
                    : (`${responseMode}.jwt` as ResponseMode)
                  : (responseMode.replace('.jwt', '') as ResponseMode)
              )
            }
          />
        </div>
        {!isInteropOpenIdInteropEventUseCase && (
          <div className="space-y-2">
            <Label htmlFor="request-purpose">Purpose</Label>
            <span className="text-xs"> - Optional. Each request has an associated default purpose</span>
            <Input name="request-purpose" value={purpose || ''} onChange={({ target }) => setPurpose(target.value)} />
          </div>
        )}
        {!hasResponse && (
          <div className="flex justify-center flex-col items-center bg-gray-200 min-h-64 w-full rounded-md">
            {authorizationRequestUriHasBeenFetched ? (
              <p className="text-gray-500 break-all">
                Authorization request has been retrieved. Waiting for response...
              </p>
            ) : authorizationRequestUri ? (
              <TooltipProvider>
                <Tooltip>
                  <div className="flex flex-col p-5 gap-2 justify-center items-center">
                    <div className="bg-white p-5 rounded-md w-[296px]">
                      <QRCode size={256} value={authorizationRequestUri} />
                    </div>
                    <TooltipTrigger asChild>
                      {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                      <p
                        onClick={(e) => navigator.clipboard.writeText(e.currentTarget.innerText)}
                        className="text-gray-500 break-all cursor-pointer"
                      >
                        {authorizationRequestUri}
                      </p>
                    </TooltipTrigger>
                    <div className="gap-2 w-full justify-center flex flex-1">
                      <div>
                        <Link href={authorizationRequestUri}>
                          <Button>Open in Wallet</Button>
                        </Link>
                      </div>
                    </div>
                    <div>
                      <Link href={authorizationRequestUri.replace('openid4vp://', 'id.animo.ausweis:')}>
                        <Button>Open in EasyPID Wallet</Button>
                      </Link>
                    </div>
                  </div>

                  <TooltipContent>
                    <p>Click to copy</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <p className="text-gray-500 break-all">Authorization request will be displayed here</p>
            )}
          </div>
        )}
        <Button onClick={onSubmitCreateRequest} className="w-full" onSubmit={onSubmitCreateRequest}>
          Verify Credential
        </Button>
        {(hasResponse || requestError) && (
          <Alert variant={isSuccess ? 'success' : requestError ? 'destructive' : 'warning'}>
            {isSuccess ? <CheckboxIcon className="h-5 w-5" /> : <ExclamationTriangleIcon className="h-4 w-4" />}
            <AlertTitle className={isSuccess ? 'mt-0.5' : ''}>
              {isSuccess
                ? 'Verification Successful'
                : requestError
                  ? 'Error creating request'
                  : 'Verification Unsuccessful'}
            </AlertTitle>
            {!isSuccess && (
              <AlertDescription className="mt-2">
                {requestError ?? requestStatus?.error ?? 'Unknown error occurred'}
              </AlertDescription>
            )}
          </Alert>
        )}

        {hasResponse && (
          <div className="flex flex-col w-full gap-4">
            {requestStatus.presentations && (
              <CollapsibleSection title="Presentations" initial="open">
                <HighLight code={JSON.stringify(requestStatus?.presentations, null, 2)} language="json" />
              </CollapsibleSection>
            )}
            {requestStatus.submission && (
              <CollapsibleSection title="Presentation Submission">
                <HighLight code={JSON.stringify(requestStatus?.submission, null, 2)} language="json" />
              </CollapsibleSection>
            )}
            {requestStatus.dcqlSubmission && (
              <CollapsibleSection title="DCQL Submission">
                <HighLight code={JSON.stringify(requestStatus?.dcqlSubmission, null, 2)} language="json" />
              </CollapsibleSection>
            )}
            {requestStatus.transactionDataSubmission && (
              <CollapsibleSection title="Transaction Data Submission">
                <HighLight code={JSON.stringify(requestStatus.transactionDataSubmission, null, 2)} language="json" />
              </CollapsibleSection>
            )}
          </div>
        )}
        {requestStatus && (
          <div className="flex flex-col w-full gap-4">
            <CollapsibleSection title="Authorization Request">
              <HighLight code={JSON.stringify(requestStatus.authorizationRequest, null, 2)} language="json" />
            </CollapsibleSection>
            {requestStatus.dcqlQuery && (
              <CollapsibleSection title="DCQL Query">
                <HighLight code={JSON.stringify(requestStatus.dcqlQuery, null, 2)} language="json" />
              </CollapsibleSection>
            )}
            {requestStatus.definition && (
              <CollapsibleSection title="Presentation Definition">
                <HighLight code={JSON.stringify(requestStatus.definition, null, 2)} language="json" />
              </CollapsibleSection>
            )}
            {requestStatus.transactionData && (
              <CollapsibleSection title="Transaction Data">
                <HighLight code={JSON.stringify(requestStatus.transactionData, null, 2)} language="json" />
              </CollapsibleSection>
            )}
          </div>
        )}

        <X509Certificates />
      </form>
    </Card>
  )
}
