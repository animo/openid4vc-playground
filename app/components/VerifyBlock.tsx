import { getRequestStatus } from '@/lib/api'
import { useInterval } from '@/lib/hooks'
import { CheckboxIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip'
import { type FormEvent, useState } from 'react'
import QRCode from 'react-qr-code'
import { HighLight } from './highLight'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { TypographyH3, TypographyH4 } from './ui/typography'

type VerifyBlockProps = {
  flowName: string
  createRequest: () => Promise<{
    verificationSessionId: string
    authorizationRequestUri: string
  }>
}

export const VerifyBlock: React.FC<VerifyBlockProps> = ({ createRequest, flowName }) => {
  const [authorizationRequestUri, setAuthorizationRequestUri] = useState<string>()
  const [verificationSessionId, setVerificationSessionId] = useState<string>()
  const [requestStatus, setRequestStatus] = useState<{
    verificationSessionId: string
    responseStatus: 'RequestCreated' | 'RequestUriRetrieved' | 'ResponseVerified' | 'Error'
    error?: string
    submission?: Record<string, unknown>
    definition?: Record<string, unknown>
    presentations?: Array<string | Record<string, unknown>>
  }>()

  const enabled =
    verificationSessionId !== undefined &&
    requestStatus?.responseStatus !== 'ResponseVerified' &&
    requestStatus?.responseStatus !== 'Error'

  const authorizationRequestUriHasBeenFetched = requestStatus?.responseStatus === 'RequestUriRetrieved'
  const hasResponse = requestStatus?.responseStatus === 'ResponseVerified' || requestStatus?.responseStatus === 'Error'
  const isSuccess = requestStatus?.responseStatus === 'ResponseVerified'

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

    const request = await createRequest()

    setVerificationSessionId(request.verificationSessionId)
    setAuthorizationRequestUri(request.authorizationRequestUri)
  }

  return (
    <Card className="p-6">
      <TypographyH3>{flowName}</TypographyH3>
      <form className="space-y-4 mt-4" onSubmit={onSubmitCreateRequest}>
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
                      <p
                        onClick={(e) => navigator.clipboard.writeText(e.currentTarget.innerText)}
                        className="text-gray-500 break-all cursor-pointer"
                      >
                        {authorizationRequestUri}
                      </p>
                    </TooltipTrigger>
                  </div>

                  <TooltipContent>
                    <p>Click to copy</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )  : (
              <p className="text-gray-500 break-all">Authorization request will be displayed here</p>
            )}
          </div>
        )}
        {hasResponse && (
          <div className="flex flex-col w-full gap-4">
            <Alert variant={isSuccess ? 'success' : 'warning'}>
              {isSuccess ? <CheckboxIcon className="h-5 w-5" /> : <ExclamationTriangleIcon className="h-4 w-4" />}
              <AlertTitle className={isSuccess ? 'mt-0.5' : ''}>
                {isSuccess ? 'Verification Successful' : 'Verification Unsuccessful'}
              </AlertTitle>
              {!isSuccess && (
                <AlertDescription className="mt-2">{requestStatus?.error ?? 'Unknown error occurred'}</AlertDescription>
              )}
            </Alert>
            {requestStatus.definition && <div>
              <TypographyH4>Presentation Definition</TypographyH4>
              <HighLight code={JSON.stringify(requestStatus?.definition, null, 2)} language="json" />
            </div>}
            {requestStatus.submission && <div>
              <TypographyH4>Presentation Submission</TypographyH4>
              <HighLight code={JSON.stringify(requestStatus?.submission, null, 2)} language="json" />
            </div>}
            {requestStatus.presentations && <div>
              <TypographyH4>Presentations</TypographyH4>
              <HighLight code={JSON.stringify(requestStatus?.presentations, null, 2)} language="json" />
            </div>}
          </div>
        )}
        <Button onClick={onSubmitCreateRequest} className="w-full" onSubmit={onSubmitCreateRequest}>
          Verify Credential
        </Button>
      </form>
    </Card>
  )
}
