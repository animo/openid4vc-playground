import { getRequestStatus, getVerifier } from '@/lib/api'
import { useInterval } from '@/lib/hooks'
import { CheckboxIcon, ExclamationTriangleIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip'
import Link from 'next/link'
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { TypographyH3 } from './ui/typography'

export type ResponseMode = 'direct_post' | 'direct_post.jwt'
type ResponseStatus = 'RequestCreated' | 'RequestUriRetrieved' | 'ResponseVerified' | 'Error'

type VerifyBlockProps = {
  flowName: string
  createRequest: ({
    presentationDefinitionId,
    requestScheme,
    responseMode,
  }: {
    presentationDefinitionId: string
    requestScheme: string
    responseMode: ResponseMode
  }) => Promise<{
    verificationSessionId: string
    authorizationRequestUri: string
    authorizationRequest: Record<string, unknown>
    responseStatus: ResponseStatus
  }>
}

export const VerifyBlock: React.FC<VerifyBlockProps> = ({ createRequest, flowName }) => {
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
    dcqlSubmission?: Record<string, unknown>
    presentations?: Array<string | Record<string, unknown>>
  }>()
  const [verifier, setVerifier] = useState<{
    presentationRequests: Array<{
      id: string
      display: string
    }>
  }>()
  const [responseMode, setResponseMode] = useState<ResponseMode>('direct_post.jwt')

  const enabled =
    verificationSessionId !== undefined &&
    requestStatus?.responseStatus !== 'ResponseVerified' &&
    requestStatus?.responseStatus !== 'Error'

  const authorizationRequestUriHasBeenFetched = requestStatus?.responseStatus === 'RequestUriRetrieved'
  const hasResponse = requestStatus?.responseStatus === 'ResponseVerified' || requestStatus?.responseStatus === 'Error'
  const isSuccess = requestStatus?.responseStatus === 'ResponseVerified'
  const [presentationDefinitionId, setPresentationDefinitionId] = useState<string>()
  const [requestScheme, setRequestScheme] = useState<string>('openid4vp://')

  useEffect(() => {
    getVerifier().then(setVerifier)
  }, [])

  useInterval({
    callback: async () => {
      if (!verificationSessionId) return

      const requestStatus = await getRequestStatus({ verificationSessionId })
      setRequestStatus(requestStatus)
    },
    interval: 500,
    enabled,
  })

  const onSubmitCreateRequest = async (e: FormEvent) => {
    e.preventDefault()

    // Clear state
    setAuthorizationRequestUri(undefined)
    setVerificationSessionId(undefined)
    setRequestStatus(undefined)

    const id = presentationDefinitionId ?? verifier?.presentationRequests[0]?.id
    if (!id) {
      throw new Error('No definition')
    }
    const request = await createRequest({ presentationDefinitionId: id, requestScheme, responseMode })
    setRequestStatus(request)
    setVerificationSessionId(request.verificationSessionId)
    setAuthorizationRequestUri(request.authorizationRequestUri)
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
      <TypographyH3>{flowName}</TypographyH3>
      <form className="space-y-4 mt-4" onSubmit={onSubmitCreateRequest}>
        <div className="space-y-2">
          <Label htmlFor="presentation-type">Presentation Type</Label>
          <Select
            name="presentation-definition-id"
            required
            value={presentationDefinitionId}
            onValueChange={(value) => setPresentationDefinitionId(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a presentation type" />
            </SelectTrigger>
            <SelectContent>
              {verifier?.presentationRequests.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.display}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="request-scheme">Scheme</Label>
          <Input
            name="request-scheme"
            required
            value={requestScheme}
            onChange={({ target }) => setRequestScheme(target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="response-mode">Response Mode</Label>
          <Select
            name="response-mode"
            required
            value={responseMode}
            onValueChange={(value) => setResponseMode(value as ResponseMode)}
          >
            <SelectTrigger className="w-1/2">
              <SelectValue placeholder="Select a credential type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem key="direct_post.jwt" value="direct_post.jwt">
                  <pre>direct_post.jwt - Response Encryption</pre>
                </SelectItem>
                <SelectItem key="direct_post" value="direct_post">
                  <pre>direct_post</pre>
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {!hasResponse && (
          <div className="flex justify-center flex-col items-center bg-gray-200 min-h-64 w-full rounded-md">
            {authorizationRequestUriHasBeenFetched ? (
              <p className="text-gray-500 break-all">
                Authorization request has been retrieved. Waiting for response...
              </p>
            ) : authorizationRequestUri ? (
              <TooltipProvider>
                <Tooltip>
                  <div className="flex flex-col p-5 gap-2 justify-center items-center gap-6">
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
                      <Link href={authorizationRequestUri.replace('openid4vp://', 'https://funke.animo.id/invitation')}>
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

        {hasResponse && (
          <div className="flex flex-col w-full gap-4">
            {hasResponse && (
              <Alert variant={isSuccess ? 'success' : 'warning'}>
                {isSuccess ? <CheckboxIcon className="h-5 w-5" /> : <ExclamationTriangleIcon className="h-4 w-4" />}
                <AlertTitle className={isSuccess ? 'mt-0.5' : ''}>
                  {isSuccess ? 'Verification Successful' : 'Verification Unsuccessful'}
                </AlertTitle>
                {!isSuccess && (
                  <AlertDescription className="mt-2">
                    {requestStatus?.error ?? 'Unknown error occurred'}
                  </AlertDescription>
                )}
              </Alert>
            )}
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
          </div>
        )}

        <X509Certificates />
      </form>
    </Card>
  )
}
