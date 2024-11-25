import { useEffect, useState } from 'react'
import { getX509Certificate } from '../lib/api'
import { CollapsibleSection } from './CollapsibleSection'

export function X509Certificates() {
  const [x509Certificate, setX509Certificate] = useState<{ pem: string; base64: string; decoded: string }>()

  useEffect(() => {
    getX509Certificate().then(setX509Certificate)
  }, [])

  console.log(x509Certificate?.pem)
  return (
    <div className="flex flex-col bg-gray-200 w-full rounded-md p-7">
      <CollapsibleSection title="X509 Certificate Base64" titleSmall="click content to copy">
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
        <p
          onClick={(e) => navigator.clipboard.writeText(e.currentTarget.innerText)}
          className="p-5 text-gray-500 break-all cursor-pointer"
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {x509Certificate?.base64 ?? 'No X509 certificate found'}
        </p>
      </CollapsibleSection>
      <CollapsibleSection title="X509 Certificate PEM" titleSmall="click content to copy">
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
        <p
          onClick={(e) => navigator.clipboard.writeText(e.currentTarget.innerText)}
          className="p-5 text-gray-500 break-all cursor-pointer"
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {x509Certificate?.pem ?? 'No X509 certificate found'}
        </p>
      </CollapsibleSection>
      <CollapsibleSection title="X509 Certificate Decoded" titleSmall="click content to copy">
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
        <p
          onClick={(e) => navigator.clipboard.writeText(e.currentTarget.innerText)}
          className="p-5 text-gray-500 break-all cursor-pointer"
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {x509Certificate?.decoded ?? 'No X509 certificate found'}
        </p>
      </CollapsibleSection>
    </div>
  )
}
