import { CheckboxIcon, CheckIcon, CopyIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip'
import { groupBy } from 'es-toolkit'
import { type ReadonlyURLSearchParams, useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import {
  type CreateIsoMdocRequestResponse,
  createIsoMdocRequest,
  createRequest,
  getRequestStatus,
  getVerifier,
  verifyIsoMdocResponse,
  verifyResponseDc,
} from '@/lib/api'
import { useInterval } from '@/lib/hooks'
import { CollapsibleSection } from './CollapsibleSection'
import { HighLight } from './highLight'
import { PlaygroundAlert } from './PlaygroundAlert'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { CardRadioItem, MiniRadioItem, RadioGroup } from './ui/radio'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { TypographyH3 } from './ui/typography'
import { X509Certificates } from './X509Certificates'

export type CreateRequestOptions = Parameters<typeof createRequest>[0]
export type CreateRequestResponse = Awaited<ReturnType<typeof createRequest>>

export type ResponseMode = 'direct_post' | 'direct_post.jwt' | 'dc_api' | 'dc_api.jwt'
export type TransactionAuthorizationType = 'none' | 'qes' | 'payment'

/**
 * Which protocol(s) to hand to the Digital Credentials API. `mdoc` uses the ISO/IEC TS 18013-7
 * Annex C `org-iso-mdoc` protocol, and is only available for requests containing mdoc credentials.
 */
export type DcApiProtocol = 'openid4vp' | 'mdoc' | 'both'
type ResponseStatus = 'RequestCreated' | 'RequestUriRetrieved' | 'ResponseVerified' | 'Error'

type RequestSignerType = CreateRequestOptions['requestSignerType']
type Verifier = {
  presentationRequests: Array<{
    id: string
    display: string
    supportsIsoMdoc: boolean
    useCase: { name: string; icon: string; tags: Array<string> }
  }>
}

type IsoMdocVerifiedResponse = Awaited<ReturnType<typeof verifyIsoMdocResponse>>

export const VerifyBlock = ({ searchParams }: { searchParams: ReadonlyURLSearchParams }) => {
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
  const [paymentAmount, setPaymentAmount] = useState('100')
  const [presentationDefinitionId, setPresentationDefinitionId] = useState<string>()

  // Only set once the user (or the URL) explicitly picks a protocol. The effective protocol is
  // derived below, so that switching to a request without mdoc credentials falls back to OpenID4VP.
  const [selectedDcApiProtocol, setSelectedDcApiProtocol] = useState<DcApiProtocol>()
  const [isoMdocRequest, setIsoMdocRequest] = useState<CreateIsoMdocRequestResponse>()
  const [isoMdocResponse, setIsoMdocResponse] = useState<IsoMdocVerifiedResponse>()

  const isDcApi = responseMode === 'dc_api' || responseMode === 'dc_api.jwt'
  const supportsIsoMdoc =
    verifier?.presentationRequests.find((r) => r.id === presentationDefinitionId)?.supportsIsoMdoc ?? false
  const dcApiProtocol: DcApiProtocol = !supportsIsoMdoc ? 'openid4vp' : (selectedDcApiProtocol ?? 'both')
  const usesIsoMdoc = isDcApi && dcApiProtocol !== 'openid4vp'
  const usesOpenId4Vp = !isDcApi || dcApiProtocol !== 'mdoc'

  const enabled =
    verificationSessionId !== undefined &&
    isoMdocResponse === undefined &&
    requestStatus?.responseStatus !== 'ResponseVerified' &&
    requestStatus?.responseStatus !== 'Error'

  const authorizationRequestUriHasBeenFetched = requestStatus?.responseStatus === 'RequestUriRetrieved'
  const hasResponse =
    requestStatus?.responseStatus === 'ResponseVerified' ||
    requestStatus?.responseStatus === 'Error' ||
    isoMdocResponse !== undefined
  const isSuccess =
    requestStatus?.responseStatus === 'ResponseVerified' ||
    (isoMdocResponse !== undefined && requestStatus?.responseStatus !== 'Error')
  const [requestScheme, setRequestScheme] = useState<string>('openid4vp://')
  const [purpose, setPurpose] = useState<string>()
  const [requestSignerType, setRequestSignerType] = useState<RequestSignerType>('x5c')
  const [requestError, setRequestError] = useState<string>()
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
    if (isDcApi) params.set('dcApiProtocol', dcApiProtocol)

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
    isDcApi,
    dcApiProtocol,
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
      if (query.dcApiProtocol) setSelectedDcApiProtocol(query.dcApiProtocol as DcApiProtocol)
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

  const initiateDc = async ({
    request,
    isoMdocRequest,
    isSigned,
  }: {
    request?: CreateRequestResponse
    isoMdocRequest?: CreateIsoMdocRequestResponse
    isSigned: boolean
  }) => {
    // An openid4vp request has a verification session to attach the error to, an mdoc-only request does not
    const setDcApiError = (error: string) => {
      if (request) setRequestStatus({ ...request, responseStatus: 'Error', error })
      else setRequestError(error)
    }

    const digitalRequests: Array<{ protocol: string; data: unknown }> = []
    if (request) {
      digitalRequests.push({
        protocol: isSigned ? 'openid4vp-v1-signed' : 'openid4vp-v1-unsigned',
        data: request.authorizationRequestObject,
      })
    }
    if (isoMdocRequest) {
      digitalRequests.push({ protocol: 'org-iso-mdoc', data: isoMdocRequest.request })
    }

    let credentialResponse: Credential | null | undefined
    try {
      credentialResponse = await navigator.credentials.get({
        // @ts-expect-error digital credentials api is not part of the dom types
        digital: {
          requests: digitalRequests,
        },
        mediation: 'required',
      })
    } catch (error) {
      setDcApiError(error instanceof Error ? error.message : 'Unknown error while calling Digital Credentials API')
      return
    }

    if (credentialResponse === undefined) {
      setDcApiError('An error occurred while requesting a credential using the Digital Credentials API')
      return
    }

    if (!credentialResponse) {
      setDcApiError('Did not receive a response from Digital Credentials API')
      return
    }

    if (credentialResponse.constructor.name !== 'DigitalCredential') {
      setDcApiError('Unknown response type from Digital Credentials API')
      return
    }

    // @ts-expect-error digital credentials api is not part of the dom types
    const data = credentialResponse.data as string | Record<string, unknown>
    // Not all browsers expose which protocol the wallet responded with. If only a single protocol
    // was requested we already know which one it is.
    const protocol =
      // @ts-expect-error digital credentials api is not part of the dom types
      (credentialResponse.protocol as string | undefined) ??
      (digitalRequests.length === 1 ? digitalRequests[0].protocol : undefined)

    if (protocol === 'org-iso-mdoc') {
      if (!isoMdocRequest) {
        setDcApiError('Received an org-iso-mdoc response, but no ISO mdoc request was created')
        return
      }

      try {
        setIsoMdocResponse(
          await verifyIsoMdocResponse({
            verificationSessionId: isoMdocRequest.verificationSessionId,
            response: typeof data === 'string' ? JSON.parse(data) : (data as { response: string }),
          })
        )
      } catch (error) {
        setDcApiError(error instanceof Error ? error.message : 'Unknown error occurred')
      }
      return
    }

    if (!request) {
      setDcApiError(`Received a response for unexpected protocol '${protocol ?? 'unknown'}'`)
      return
    }

    try {
      setRequestStatus(
        await verifyResponseDc({
          verificationSessionId: request.verificationSessionId,
          data: data as string | Record<string, unknown>,
        })
      )
    } catch (error) {
      setDcApiError(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  const onSubmitCreateRequest = async (e: FormEvent) => {
    e.preventDefault()

    // Clear state
    setAuthorizationRequestUri(undefined)
    setVerificationSessionId(undefined)
    setRequestStatus(undefined)
    setRequestError(undefined)
    setIsoMdocRequest(undefined)
    setIsoMdocResponse(undefined)

    const id = presentationDefinitionId ?? verifier?.presentationRequests[0]?.id
    if (!id) {
      throw new Error('No definition')
    }

    let request: CreateRequestResponse | undefined
    if (usesOpenId4Vp) {
      try {
        request = await createRequest({
          presentationDefinitionId: id,
          requestScheme,
          responseMode,
          purpose: purpose && purpose !== '' ? purpose : undefined,
          requestSignerType,
          transactionAuthorizationType,
          paymentAmount,
        })
        if (responseMode.includes('direct_post')) {
          setAuthorizationRequestUri(request.authorizationRequestUri)
        }
        setRequestStatus(request)
        setVerificationSessionId(request.verificationSessionId)
      } catch (error) {
        setRequestError(error instanceof Error ? error.message : 'Unknown error occurred')
        return
      }
    }

    let createdIsoMdocRequest: CreateIsoMdocRequestResponse | undefined
    if (usesIsoMdoc) {
      try {
        // The x509 request signer is what signs the mdoc reader authentication
        createdIsoMdocRequest = await createIsoMdocRequest({
          presentationDefinitionId: id,
          useReaderAuth: requestSignerType !== 'none',
        })
        setIsoMdocRequest(createdIsoMdocRequest)
      } catch (error) {
        setRequestError(error instanceof Error ? error.message : 'Unknown error occurred')
        return
      }
    }

    if (isDcApi) {
      await initiateDc({
        request,
        isoMdocRequest: createdIsoMdocRequest,
        isSigned: requestSignerType !== 'none',
      })
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

  return (
    <Card className="p-6">
      <PlaygroundAlert />
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
            <MiniRadioItem key="qr" value="qr" label="QR / Deeplink" />
            <MiniRadioItem key="dcApi" value="dcApi" label="Digital Credentials API" />
          </RadioGroup>
        </div>
        {isDcApi && (
          <div className="space-y-2">
            <Label htmlFor="dc-api-protocol">Digital Credentials API Protocol</Label>
            <span className="text-xs">
              {supportsIsoMdoc
                ? ' - ISO mdoc is only used for the mdoc credentials in this request'
                : ' - ISO mdoc requires a request containing mdoc credentials'}
            </span>
            <RadioGroup
              name="dc-api-protocol"
              required
              value={dcApiProtocol}
              onValueChange={(value) => setSelectedDcApiProtocol(value as DcApiProtocol)}
            >
              <MiniRadioItem key="openid4vp" value="openid4vp" label="OpenID4VP" />
              <MiniRadioItem key="mdoc" value="mdoc" label="ISO mdoc" disabled={!supportsIsoMdoc} />
              <MiniRadioItem key="both" value="both" label="Both" disabled={!supportsIsoMdoc} />
            </RadioGroup>
          </div>
        )}
        {usesIsoMdoc && (
          <Alert variant="default">
            <AlertTitle>ISO/IEC TS 18013-7 Annex C</AlertTitle>
            <AlertDescription className="mt-2">
              {dcApiProtocol === 'both'
                ? 'Both the openid4vp and org-iso-mdoc protocols are offered to the wallet, which picks one to respond with. '
                : 'Requests the mdoc credentials of this request over the org-iso-mdoc protocol. '}
            </AlertDescription>
          </Alert>
        )}
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
            {/* <MiniRadioItem key="openid-federation" value="openid-federation" label="OpenID Federation" /> */}
            {responseMode.includes('dc_api') && <MiniRadioItem key="none" value="none" label="None" />}
          </RadioGroup>
        </div>

        {usesOpenId4Vp && (
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
                <SelectItem value="payment">Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {usesOpenId4Vp && transactionAuthorizationType === 'payment' && (
          <div>
            <Label htmlFor="payment-amount">Payment amount (EUR)</Label>
            <Input
              name="payment-amount"
              value={paymentAmount || ''}
              onChange={({ target }) => setPaymentAmount(target.value)}
            />
          </div>
        )}
        {usesOpenId4Vp && (
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
        )}
        {usesOpenId4Vp && (
          <div className="space-y-2">
            <Label htmlFor="request-purpose">Purpose</Label>
            <span className="text-xs"> - Optional. Each request has an associated default purpose</span>
            <Input name="request-purpose" value={purpose || ''} onChange={({ target }) => setPurpose(target.value)} />
          </div>
        )}
        {usesOpenId4Vp && !hasResponse && (
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
                      {/* biome-ignore lint/a11y/useKeyWithClickEvents: no explanation */}
                      <p
                        onClick={(e) => navigator.clipboard.writeText(e.currentTarget.innerText)}
                        className="text-gray-500 break-all cursor-pointer"
                      >
                        {authorizationRequestUri}
                      </p>
                    </TooltipTrigger>
                    <div className="gap-2 w-full justify-center flex flex-1">
                      <div>
                        <a href={authorizationRequestUri}>
                          <Button type="button">Open in Wallet</Button>
                        </a>
                      </div>
                    </div>
                    <div>
                      <a href={authorizationRequestUri.replace('openid4vp://', 'id.animo.paradym:')}>
                        <Button type="button">Open in Paradym Wallet</Button>
                      </a>
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
            {isSuccess && isoMdocResponse && (
              <AlertDescription className="mt-2">
                ISO mdoc response verified for origin {isoMdocResponse.origin}
              </AlertDescription>
            )}
          </Alert>
        )}

        {(isoMdocResponse || isoMdocRequest) && (
          <div className="flex flex-col w-full gap-4">
            {isoMdocResponse && (
              <CollapsibleSection title="Device Response" initial="open">
                <HighLight code={JSON.stringify(isoMdocResponse.deviceResponse, null, 2)} language="json" />
              </CollapsibleSection>
            )}
            {isoMdocRequest && (
              <>
                <CollapsibleSection title="Device Request">
                  <HighLight code={JSON.stringify(isoMdocRequest.docRequests, null, 2)} language="json" />
                </CollapsibleSection>
                <CollapsibleSection title="DC API Request (ISO mdoc)">
                  <HighLight code={JSON.stringify(isoMdocRequest.request, null, 2)} language="json" />
                </CollapsibleSection>
              </>
            )}
          </div>
        )}

        {hasResponse && requestStatus && (
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
