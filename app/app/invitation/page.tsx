'use client'

import { useEffect, useState } from 'react'

export default function InvitationPage() {
  const [iFrameUrl, setIFrameUrl] = useState<string>()

  useEffect(
    () =>
      setIFrameUrl(
        location.href
          .replace('https://funke.animo.id/invitation', 'https://paradym.id/invitation')
          .replace('http://localhost:3000/invitation', 'https://paradym.id/invitation')
      ),
    []
  )

  return (
    <iframe
      id="dynamic-iframe"
      src={iFrameUrl}
      title="Invitation"
      style={{
        position: 'fixed',
        width: '100%',
        height: '100%',
        border: 'none',
      }}
    />
  )
}
