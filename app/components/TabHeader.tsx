import { CheckIcon, CopyIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { Button } from './ui/button'

/** The tab's title, with a button that copies the URL holding the tab's configuration. */
export function TabHeader({ title }: { title: string }) {
  const [copiedTimeout, setCopiedTimeout] = useState<ReturnType<typeof setTimeout>>()

  const copyConfiguration = async () => {
    clearTimeout(copiedTimeout)
    await navigator.clipboard.writeText(window.location.href)
    setCopiedTimeout(setTimeout(() => setCopiedTimeout(undefined), 3000))
  }

  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h3 className="font-semibold text-gray-900 text-xl tracking-tight">{title}</h3>
      <Button type="button" variant="ghost" size="sm" onClick={copyConfiguration} className="gap-2">
        {copiedTimeout ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
        {copiedTimeout ? 'Copied' : 'Copy configuration'}
      </Button>
    </div>
  )
}
