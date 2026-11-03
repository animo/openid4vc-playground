import { GitHubLogoIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import Image from 'next/image'

export function PlaygroundAlert() {
  return (
    <div className="mb-6 flex gap-3 rounded-lg bg-gray-50 p-4 text-gray-600 text-sm leading-relaxed [&_code]:text-[0.85em] [&_code]:text-gray-800">
      <InfoCircledIcon className="mt-0.5 size-4 shrink-0 text-gray-400" />
      <div className="space-y-2">
        <p>
          This playground implements <code>OpenID4VC 1.0</code>, <code>OpenID4VP 1.0</code>, <code>SD-JWT VC</code>,{' '}
          <code>mDOC</code>, and most of the <code>High Assurance Interop Profile</code> (full support pending).
        </p>
        <p>
          You can use it with the{' '}
          <a
            target="_blank"
            href="https://linktr.ee/paradym_id"
            className="inline-flex items-center gap-1 text-gray-900 underline underline-offset-2"
            rel="noreferrer"
          >
            <Image
              src="/assets/paradym-wallet-logo.png"
              width={11}
              height={14}
              alt=""
              className="inline h-[14px] p-0"
            />
            Paradym Wallet
          </a>
          , or any other wallet implementation compliant with the High Assurance Interoperability Profile. If you
          experience any issues when using this playground, please open an issue in the{' '}
          <a
            target="_blank"
            className="inline-flex items-center gap-1 text-gray-900 underline underline-offset-2"
            href="https://github.com/animo/openid4vc-playground"
            rel="noreferrer"
          >
            <GitHubLogoIcon /> Playground GitHub
          </a>
          .
        </p>
      </div>
    </div>
  )
}
