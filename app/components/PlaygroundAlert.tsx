import { GitHubLogoIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

export function PlaygroundAlert() {
  return (
    <Alert variant="default" className="mb-5">
      <InfoCircledIcon className="h-4 w-4" />
      <AlertTitle>Info</AlertTitle>
      <AlertDescription>
        This playground is specifically adapted for interoperability with the France Identité 🇫🇷 wallet targeting
        verification of <code>ISO 18013-5 mDOC</code> credentials using <code>ISO 18013-7:2024 (Annex B)</code>. You can
        read more about access to the{' '}
        <a
          target="_blank"
          href="https://linktr.ee/paradym_id"
          className="inline-flex gap-1 pl-px underline"
          rel="noreferrer"
        >
          France Identité 🇫🇷 Sandbox Environment
        </a>
        .
        <br />
        <br />
        You can also check out the{' '}
        <a
          target="_blank"
          href="https://linktr.ee/paradym_id"
          className="inline-flex gap-1 pl-px underline"
          rel="noreferrer"
        >
          full Animo Playground
        </a>{' '}
        which in addition supports <code>OpenID4VC 1.0</code>, <code>OpenID4VP 1.0</code>, <code>SD-JWT VC</code>,{' '}
        <code>W3C Digital Credentials API</code>, and most of the <code>High Assurance Interop Profile</code> (full
        support pending).
        <br />
        <br />
        If you experience any issues when using this playground, please open an issue in the
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
