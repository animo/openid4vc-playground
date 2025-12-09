import { GitHubLogoIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import Image from 'next/image'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

export function PlaygroundAlert() {
  return (
    <Alert variant="default" className="mb-5">
      <InfoCircledIcon className="h-4 w-4" />
      <AlertTitle>Info</AlertTitle>
      <AlertDescription>
        This playground implements <code>OpenID4VC 1.0</code>, <code>OpenID4VP 1.0</code>, <code>SD-JWT VC</code>,{' '}
        <code>mDOC</code>, and most of the <code>High Assurance Interop Profile</code> (full supporting pending).
        <br />
        <br />
        You can use it with the{' '}
        <a
          target="_blank"
          href="https://linktr.ee/paradym_id"
          className="inline-flex gap-1 pl-[1px] underline"
          rel="noreferrer"
        >
          <Image
            src="/assets/paradym-wallet-logo.png"
            width={11}
            height={14}
            alt="Paradym Wallet Logo"
            className="inline p-0 h-[14px]"
          />
          Paradym Wallet
        </a>
        , or any other wallet implementation compliant with the High Assurance Interoperability Profile. If you
        experience any issues when using this playground, please open an issue in the
        <a
          target="_blank"
          className="inline-flex gap-1 pl-1.5 underline"
          href="https://github.com/animo/openid4vc-playground"
          rel="noreferrer"
        >
          <GitHubLogoIcon className="inline inline-flex" /> Playground GitHub
        </a>
        .
      </AlertDescription>
    </Alert>
  )
}
