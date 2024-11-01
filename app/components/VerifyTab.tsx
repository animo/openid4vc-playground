import { useEffect, useState } from 'react'
import { createRequest, getX509Certificate } from '../lib/api'
import { type ResponseMode, VerifyBlock } from './VerifyBlock'

export function VerifyTab() {
  const [x509Certificate, setX509Certificate] = useState<string>()

  const createRequestForVerification = async (options: {
    presentationDefinitionId: string
    requestScheme: string
    responseMode: ResponseMode
  }) => {
    return await createRequest({
      requestScheme: options.requestScheme,
      presentationDefinitionId: options.presentationDefinitionId,
      responseMode: options.responseMode,
    })
  }

  useEffect(() => {
    getX509Certificate().then(({ certificate }) => setX509Certificate(certificate))
  }, [])

  return (
    <>
      <VerifyBlock flowName="Verify" createRequest={createRequestForVerification} x509Certificate={x509Certificate} />
    </>
  )
}
