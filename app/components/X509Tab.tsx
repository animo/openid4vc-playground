import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { CheckboxIcon, ExclamationTriangleIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import { type FormEvent, useState } from 'react'
import { addX509Certificate } from '../lib/api'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { HighLight } from './highLight'

export function X509Tab() {
  const [x509Certificate, setX509Certificate] = useState<string>()
  const [response, setResponse] = useState<{ success: true; body: string } | { success: false; error: any }>()

  async function onSubmitX509Certificate(e: FormEvent) {
    e.preventDefault()

    setResponse(undefined)
    if (!x509Certificate) return
    try {
      const response = await addX509Certificate(x509Certificate)
      console.log(response.ok)
      if (response.ok) {
        setResponse({ success: true, body: await response.text() })
      } else {
        setResponse({ success: false, error: await response.json().catch(() => 'Unkonwn parsing error') })
      }
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    } catch (error: any) {
      setResponse({
        success: false,
        error: error.message,
      })
    }
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
      <form className="space-y-4" onSubmit={onSubmitX509Certificate}>
        <div className="space-y-2">
          <Label htmlFor="x509-certificate">X509 Certificate (PEM or Base64)</Label>
          <textarea
            className="w-full h-40 p-2 rounded-md bg-white border border-gray-300"
            id="x509-certificate"
            required
            onChange={(e) => setX509Certificate(e.currentTarget.value)}
          />
        </div>
        {/* <div className="flex justify-center items-center bg-gray-200 min-h-64 w-full rounded-md"> */}
        {response ? (
          <Alert variant={response.success ? 'success' : 'warning'}>
            {response.success ? <CheckboxIcon className="h-5 w-5" /> : <ExclamationTriangleIcon className="h-4 w-4" />}
            <AlertTitle className={response.success ? 'mt-0.5' : ''}>
              {response.success ? 'Succesfully added X509 certificate' : 'Error adding X509 certificate'}
            </AlertTitle>
            {!response.success && (
              <AlertDescription className="mt-2">
                {response.error ? JSON.stringify(response.error, null, 2) : 'Unknown error occurred'}
              </AlertDescription>
            )}
            {response.success && (
              <AlertDescription className="mt-2">
                <HighLight code={response.body} language="text" />
              </AlertDescription>
            )}
          </Alert>
        ) : (
          <p className="text-gray-500">X509 Certificates will be reset on every server restart and deployment.</p>
        )}
        {/* </div> */}
        <Button className="w-full" onClick={onSubmitX509Certificate} onSubmit={onSubmitX509Certificate}>
          Add X509 Certificate
        </Button>
      </form>
    </Card>
  )
}
