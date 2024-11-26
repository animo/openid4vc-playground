import { useEffect, useState } from 'react'
import { createRequest, getX509Certificate } from '../lib/api'
import { VerifyBlock } from './VerifyBlock'

export type CreateRequestOptions = Parameters<typeof createRequest>[0]
export type CreateRequestResponse = Awaited<ReturnType<typeof createRequest>>

export function VerifyTab() {
  const [x509Certificate, setX509Certificate] = useState<string>()

  useEffect(() => {
    getX509Certificate().then(({ certificate }) => setX509Certificate(certificate))
  }, [])

  return (
    <>
      <VerifyBlock flowName="Verify" createRequest={createRequest} x509Certificate={x509Certificate} />
    </>
  )
}
