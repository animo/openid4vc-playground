import type { PropsWithChildren } from 'react'
import QRCode from 'react-qr-code'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

/** Where a credential offer or authorization request shows up: a placeholder, the QR code, then its progress. */
export function WalletLinkPanel({
  uri,
  paradymUri,
  status,
  placeholder,
  children,
}: PropsWithChildren<{ uri?: string; paradymUri?: string; status?: string; placeholder: string }>) {
  return (
    <div className="flex min-h-32 w-full flex-col items-center justify-center gap-5 rounded-lg border border-gray-300 border-dashed bg-gray-50 p-4 text-center text-sm text-gray-500 sm:min-h-40 sm:p-6">
      {status ? (
        <p>{status}</p>
      ) : uri ? (
        <>
          <div className="w-full max-w-64 rounded-lg border border-gray-200 bg-white p-4">
            <QRCode size={256} value={uri} style={{ width: '100%', height: 'auto' }} />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(uri)}
                  className="line-clamp-3 max-w-md cursor-pointer break-all font-mono text-gray-500 text-xs hover:text-gray-900"
                >
                  {uri}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to copy</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <a href={uri}>Open in Wallet</a>
            </Button>
            {paradymUri && (
              <Button asChild>
                <a href={paradymUri}>Open in Paradym Wallet</a>
              </Button>
            )}
          </div>
          {children}
        </>
      ) : (
        <p>{placeholder}</p>
      )}
    </div>
  )
}
