import { getRequestStatus } from '@/lib/api'
import { useInterval } from '@/lib/hooks'
import { CheckboxIcon, ExclamationTriangleIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip'
import { type FormEvent, useState } from 'react'
import QRCode from 'react-qr-code'
import { HighLight } from './highLight'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Label } from './ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { TypographyH3, TypographyH4 } from './ui/typography'

export type CredentialType = 'mdoc' | 'sdjwt'
export type RequestType = 'name_age_over_21' | 'city' | 'age_birth_family_name'

type VerifyBlockProps = {
  flowName: string
  x509Certificate?: string
  createRequest: ({
    credentialType,
    requestType,
  }: {
    credentialType: CredentialType
    requestType: RequestType
  }) => Promise<{
    verificationSessionId: string
    authorizationRequestUri: string
  }>
}

export const VerifyBlock: React.FC<VerifyBlockProps> = ({ createRequest, flowName, x509Certificate }) => {
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
  const [credentialType, setCredentialType] = useState<CredentialType>('sdjwt')
  const [requestType, setRequestType] = useState<RequestType>('name_age_over_21')

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

    const request = await createRequest({ credentialType, requestType })

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
            Animo's EUDI Wallet Prototype
          </a>
          .
        </AlertDescription>
      </Alert>
      <TypographyH3>{flowName}</TypographyH3>
      <form className="space-y-4 mt-4" onSubmit={onSubmitCreateRequest}>
        <div className="space-y-2">
          <Label htmlFor="credential-type">Credential Type</Label>
          <Select
            name="credential-type"
            required
            value={credentialType}
            onValueChange={(value) => setCredentialType(value as 'mdoc' | 'sdjwt')}
          >
            <SelectTrigger className="w-[320px]">
              <SelectValue placeholder="Select a credential type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem key="sdjwt" value="sdjwt">
                  SD-JWT VC (C/C'/B')
                </SelectItem>
                <SelectItem key="mdoc" value="mdoc">
                  mDOC (C/C')
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="request-type">Request Type</Label>
          <Select
            name="request-type"
            required
            value={requestType}
            onValueChange={(value) => setRequestType(value as RequestType)}
          >
            <SelectTrigger className="w-[320px]">
              <SelectValue placeholder="Select the attributes to request" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="name_age_over_21">Names and Age over 21</SelectItem>
                <SelectItem value="city">Address (City) and Place of Birth</SelectItem>
                <SelectItem value="age_birth_family_name">Age and Birth Family Name</SelectItem>
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
            ) : (
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
            {requestStatus.definition && (
              <div>
                <TypographyH4>Presentation Definition</TypographyH4>
                <HighLight code={JSON.stringify(requestStatus?.definition, null, 2)} language="json" />
              </div>
            )}
            {requestStatus.submission && (
              <div>
                <TypographyH4>Presentation Submission</TypographyH4>
                <HighLight code={JSON.stringify(requestStatus?.submission, null, 2)} language="json" />
              </div>
            )}
            {requestStatus.presentations && (
              <div>
                <TypographyH4>Presentations</TypographyH4>
                <HighLight code={JSON.stringify(requestStatus?.presentations, null, 2)} language="json" />
              </div>
            )}
          </div>
        )}
        <Button onClick={onSubmitCreateRequest} className="w-full" onSubmit={onSubmitCreateRequest}>
          Verify Credential
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
