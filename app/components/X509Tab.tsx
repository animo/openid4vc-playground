import { CheckboxIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { addX509Certificate } from '../lib/api'
import { Field } from './Field'
import { HighLight } from './highLight'
import { PlaygroundAlert } from './PlaygroundAlert'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

export function X509Tab() {
  const [x509Certificate, setX509Certificate] = useState<string>()
  const [response, setResponse] = useState<{ success: true; body: string } | { success: false; error: unknown }>()

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
      // biome-ignore lint/suspicious/noExplicitAny: no explanation
    } catch (error: any) {
      setResponse({
        success: false,
        error: error.message,
      })
    }
  }

  return (
    <Card className="p-4 sm:p-6">
      <PlaygroundAlert />
      <h3 className="mb-6 font-semibold text-gray-900 text-xl tracking-tight">Manage Certificates</h3>
      <form className="space-y-4" onSubmit={onSubmitX509Certificate}>
        <Field
          label="X509 Certificate (PEM or Base64)"
          description="Trusted certificates are reset on every server restart and deployment."
          htmlFor="x509-certificate"
        >
          <textarea
            className="h-40 w-full rounded-md border border-input bg-white p-3 font-mono text-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            id="x509-certificate"
            required
            onChange={(e) => setX509Certificate(e.currentTarget.value)}
          />
        </Field>
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
        ) : null}
        {/* </div> */}
        <Button type="submit" className="w-full">
          Add X509 Certificate
        </Button>
      </form>
    </Card>
  )
}
