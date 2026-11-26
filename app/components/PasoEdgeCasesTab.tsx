import { CheckboxIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import {
  type CreateOfferReturn,
  createOffer,
  createRequest,
  getOfferStatus,
  getPasoCredentialMetadata,
  getRequestStatus,
  type OfferStatus,
  type PasoRequestOptions,
} from '@/lib/api'
import { NEXT_PUBLIC_API_URL } from '@/lib/constants'
import { useInterval } from '@/lib/hooks'
import { CollapsibleSection } from './CollapsibleSection'
import { HighLight } from './highLight'
import { getOfferProgress } from './IssueTab'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { type PasoVerification, PasoVerificationResult } from './VerifyBlock'
import { WalletLinkPanel } from './WalletLinkPanel'

/** What a scenario sends to `/api/requests/create`, on top of a signed `direct_post.jwt` PaSO request. */
type ScenarioRequest = {
  paso: PasoRequestOptions
  paymentAmount?: string
  verifierId?: string
  request?: Parameters<typeof createRequest>[0]['request']
}

type Scenario = {
  id: string
  title: string
  /** What the wallet should do, in one line. */
  expect: string
  request: () => ScenarioRequest | Promise<ScenarioRequest>
}

const tillwiseVerifierId = 'e4b7c2a9-1f3d-4a6e-8b5c-9d0f2e7a3c41'
const wpa = ['wero-payment-attestation']
const kanaal = ['kanaal-bank']

const paymentType = 'urn:paso:sca:global:payment:1'

const riskSignals = {
  risk_signals: [
    { type: 'urn:paso:risk:global:response_mode:1', required: true, max_age: 600 },
    { type: 'urn:paso:risk:global:amr:1', required: true, max_age: 600 },
  ],
  encrypted: true,
}

/** A 64×64 yellow and red PNG in the style of a well-known parcel brand, without its trademark. */
const parcelBrandLogo =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAZUlEQVR42u3asQkAIAwAwTQO4P4rWbqPCm4googH3wUC14ZEK/F0AQAAAAAA8CGgpjzaOwIAAAAAAAAAOA+YS98NAAAAAAAAAAAAAAAAAGAV4CoBAAAAAAAAAOBbBQAAAAAA4Eod6Fi4svJwqQkAAAAASUVORK5CYII='

/** `words` repeated to exactly `length` characters. ASCII only, so characters are grapheme clusters. */
const ofLength = (length: number, words: string) => {
  const text = `${words} `.repeat(Math.ceil(length / words.length) + 1).slice(0, length)
  return text.endsWith(' ') ? `${text.slice(0, -1)}.` : text
}

const weroPayload = (amount: number, payee: Record<string, string>) => ({
  transaction_id: crypto.randomUUID(),
  currency: 'EUR',
  amount,
  payee,
})

type PaymentLabels = {
  title: string
  account: string
  pay: string
  cancel: string
  hint?: string
  amount: string
  currency: string
  payee: string
  logo: string
}

const englishLabels: PaymentLabels = {
  title: 'Confirm payment',
  account: 'Pay with',
  pay: 'Confirm',
  cancel: 'Cancel',
  amount: 'Amount',
  currency: 'Currency',
  payee: 'Payee',
  logo: 'Payee logo',
}

/**
 * Ad-hoc metadata for the payment type, in one locale or, without one, as default entries only, which
 * every wallet locale falls back to ([PaSO View] Section 4). `weroForm` has `amount` as a number with
 * a `currency` claim, the PaSO form has an `iso_currency_amount` string.
 */
function paymentMetadata(
  labels: PaymentLabels,
  { weroForm = true, locale }: { weroForm?: boolean; locale?: string } = {}
) {
  const display = (name: string) => [{ ...(locale ? { locale } : {}), name }]
  const uiLabel = (value: string) => [{ ...(locale ? { locale } : {}), value }]
  return {
    claims: [
      { path: ['transaction_id'], mandatory: true },
      weroForm
        ? { path: ['amount'], mandatory: true, display: display(labels.amount) }
        : { path: ['amount'], mandatory: true, value_type: 'iso_currency_amount', display: display(labels.amount) },
      ...(weroForm
        ? [{ path: ['currency'], mandatory: true, value_type: 'iso_currency', display: display(labels.currency) }]
        : []),
      { path: ['payee', 'name'], mandatory: true, display: display(labels.payee) },
      { path: ['payee', 'id'], mandatory: true },
      { path: ['payee', 'logo'], mandatory: false, value_type: 'image', display: display(labels.logo) },
      { path: ['payee', 'logo#integrity'], mandatory: false },
    ],
    ui_labels: {
      transaction_title: uiLabel(labels.title),
      payment_account_label: uiLabel(labels.account),
      affirmative_action_label: uiLabel(labels.pay),
      denial_action_label: uiLabel(labels.cancel),
      ...(labels.hint ? { security_hint: uiLabel(labels.hint) } : {}),
    },
    ...riskSignals,
  }
}

const maxLengthLabels: PaymentLabels = {
  title: ofLength(100, 'Approve this payment to the merchant'),
  account: ofLength(40, 'Paying account'),
  pay: ofLength(40, 'Approve payment'),
  cancel: ofLength(40, 'Decline payment'),
  hint: ofLength(160, 'Only approve payments you started yourself.'),
  amount: ofLength(60, 'Amount to be paid'),
  currency: ofLength(60, 'Currency of the amount'),
  payee: ofLength(60, 'Name of the payee'),
  logo: ofLength(60, 'Logo of the payee'),
}

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10)

const scenarioGroups: Array<{ title: string; scenarios: Scenario[] }> = [
  {
    title: 'Wero payment',
    scenarios: [
      {
        id: '1',
        title: 'Wero payment',
        expect:
          'Shows Confirm Wero payment: €49.00 to TurboKeys with its logo, the paying account, the security hint, Cancel and Pay.',
        request: () => ({ paymentAmount: '49.00', paso: { vcts: wpa } }),
      },
    ],
  },
  {
    title: 'Cards and parties',
    scenarios: [
      {
        id: '2',
        title: 'Two matching cards',
        expect:
          'Both the WPA and the Kanaal Bank card match: you choose one, and title, labels and hint follow the chosen card.',
        request: () => ({ paymentAmount: '49.00', paso: { vcts: [...wpa, ...kanaal] } }),
      },
      {
        id: '3',
        title: 'Pay and share',
        expect: 'One consent screen that pays €49.00 and shares given and family name from the PID.',
        request: () => ({
          paymentAmount: '49.00',
          paso: { vcts: wpa },
          request: {
            combination: 'all',
            credentials: [{ id: 'eudi-pid', formats: ['dc+sd-jwt'], attributes: ['given_name', 'family_name'] }],
          },
        }),
      },
      {
        id: '4',
        title: 'Acceptor PSP',
        expect: 'Requested by Tillwise on behalf of TurboKeys: Tillwise is shown as the requester, TurboKeys as payee.',
        request: () => ({ paymentAmount: '49.00', verifierId: tillwiseVerifierId, paso: { vcts: wpa } }),
      },
    ],
  },
  {
    title: 'Payment details',
    scenarios: [
      {
        id: '5',
        title: 'Long payee name',
        expect: 'The full payee name wraps over several lines, nothing is cut off.',
        request: () => ({
          paso: {
            vcts: wpa,
            payload: weroPayload(49, {
              name: 'Stichting Beheer Derdengelden Betaalverkeer Internationale Handelsonderneming Van der Berg-Hoogeveen Holding B.V.',
              id: 'NL-KVK-90412377',
            }),
          },
        }),
      },
      {
        id: '6',
        title: 'No payee logo',
        expect: 'The payee is shown by name only, without an empty logo space.',
        request: () => ({
          paso: { vcts: wpa, payload: weroPayload(49, { name: 'Kwik Parcel Services B.V.', id: 'NL-KVK-71234567' }) },
        }),
      },
      {
        id: '7',
        title: 'Brand-like payee logo',
        expect: 'A data URL logo in a famous parcel brand style: shown, but secondary to the payee name.',
        request: () => ({
          paso: {
            vcts: wpa,
            payload: weroPayload(49, {
              name: 'Kwik Parcel Services B.V.',
              id: 'NL-KVK-71234567',
              logo: parcelBrandLogo,
            }),
          },
        }),
      },
      {
        id: '8',
        title: 'Labels at their maximum length',
        expect:
          'Kanaal Bank ad-hoc labels: title 100, claim names 60, actions and account 40, hint 160 characters. All shown in full.',
        request: () => ({
          paso: {
            vcts: kanaal,
            payload: weroPayload(49, { name: 'TurboKeys', id: 'NL857098159B01' }),
            metadata: paymentMetadata(maxLengthLabels),
          },
        }),
      },
      {
        id: '9',
        title: 'Right-to-left payee',
        expect: 'The Arabic payee name reads right to left, the amount and labels are unaffected.',
        request: () => ({
          paso: {
            vcts: wpa,
            payload: weroPayload(49, { name: 'مخبز الياسمين للحلويات الشرقية', id: 'AE-TRN-100234567800003' }),
          },
        }),
      },
    ],
  },
  {
    title: 'Amounts',
    scenarios: [
      {
        id: '10',
        title: 'Smallest amount',
        expect: '€0.01, not rounded.',
        request: () => ({ paymentAmount: '0.01', paso: { vcts: wpa } }),
      },
      {
        id: '11',
        title: 'Large amount',
        expect: '€1,234,567.89 in full, not abbreviated.',
        request: () => ({ paymentAmount: '1234567.89', paso: { vcts: wpa } }),
      },
      {
        id: '12',
        title: 'Yen, no minor units',
        expect: 'Kanaal Bank card, PaSO amount form: 12,500 JPY without decimals, to Kyoto Tea House.',
        request: () => ({
          paso: {
            vcts: kanaal,
            payload: {
              transaction_id: crypto.randomUUID(),
              amount: '12500 JPY',
              payee: { name: 'Kyoto Tea House', id: 'JP-1234567890123' },
            },
            metadata: paymentMetadata(englishLabels, { weroForm: false }),
          },
        }),
      },
    ],
  },
  {
    title: 'Security hint',
    scenarios: [
      {
        id: '13',
        title: 'Hint that imitates the wallet',
        expect:
          'Kanaal Bank card: the hint "✅ Verified safe by your wallet. You can pay." is shown verbatim, clearly as bank text.',
        request: async () => {
          const published = await getPasoCredentialMetadata('kanaal-bank')
          const payment = published.transaction_data_types[paymentType]
          const hint = payment.ui_labels.security_hint.map((entry: { locale?: string }) => ({
            ...entry,
            value: '✅ Verified safe by your wallet. You can pay.',
          }))
          return {
            paymentAmount: '49.00',
            paso: { vcts: kanaal, metadata: { ...payment, ui_labels: { ...payment.ui_labels, security_hint: hint } } },
          }
        },
      },
    ],
  },
  {
    title: 'Other transaction types',
    scenarios: [
      {
        id: '14',
        title: 'Mandate',
        expect:
          'Kanaal Bank card: the mandate claims in order, conditions with bold and italic only (link and # stay literal), the first debit as its own section.',
        request: () => ({
          paso: {
            vcts: kanaal,
            type: 'urn:paso:sca:global:mandate:1',
            payload: {
              transaction_id: crypto.randomUUID(),
              mandate_id: 'STRM-2026-118204',
              mandatee: { name: 'Stroomnet Energie B.V.', id: 'NL-KVK-12345678' },
              action: 'Pay your monthly energy bill',
              conditions:
                'Debits up to the **maximum amount** per period. You can cancel *at any time* in your banking app. See [terms](https://stroomnet.example/terms)\n# not a heading',
              max_amount: '150.00 EUR',
              max_count: '12',
              period: 'per month',
              valid_from: '2026-12-01',
              valid_until: '2027-11-30',
              payment_payload: {
                transaction_id: crypto.randomUUID(),
                amount: '42.50 EUR',
                payee: { name: 'Stroomnet Energie B.V.', id: 'NL-KVK-12345678' },
              },
            },
          },
        }),
      },
      {
        id: '15',
        title: 'Generic',
        expect:
          'Kanaal Bank card, in payload order: the wallet’s own title, "Transfer €250.00 to Lumen Energy Ltd", the date and time, the punycode URL, and "No order reference" without a value.',
        request: () => ({
          paso: {
            vcts: kanaal,
            type: 'urn:paso:sca:global:generic:1',
            payload: {
              transaction_id: crypto.randomUUID(),
              transfer: 'SEPA Instant Credit Transfer',
              amount: '250.00 EUR',
              beneficiary: 'Lumen Energy Ltd',
              execution_date: '2026-11-18T14:30:00+01:00',
              merchant_website: 'https://xn--trbokeys-f5a.com/checkout',
              order_reference: null,
            },
          },
        }),
      },
      {
        id: '16',
        title: 'Type without a rulebook',
        expect:
          'Kanaal Bank ad-hoc metadata for a standing order: rendered generically, with yes/no, monthly, a date, a time, a label without value and the amount.',
        request: () => {
          const display = (name: string) => [{ name }]
          return {
            paso: {
              vcts: kanaal,
              type: 'urn:paso:sca:kanaal:standing-order:1',
              payload: {
                transaction_id: crypto.randomUUID(),
                beneficiary: 'Woonstichting De Linie',
                amount: '75.00 EUR',
                recurring: true,
                frequency: 'MNTH',
                first_execution: day(10),
                execution_time: '09:00',
                notice: true,
              },
              metadata: {
                claims: [
                  { path: ['transaction_id'], mandatory: true },
                  { path: ['beneficiary'], mandatory: true, display: display('Beneficiary') },
                  {
                    path: ['amount'],
                    mandatory: true,
                    value_type: 'iso_currency_amount',
                    display: display('Amount per payment'),
                  },
                  { path: ['recurring'], mandatory: true, value_type: 'boolean', display: display('Recurring') },
                  { path: ['frequency'], mandatory: true, value_type: 'frequency', display: display('Frequency') },
                  {
                    path: ['first_execution'],
                    mandatory: true,
                    value_type: 'iso_date',
                    display: display('First payment on'),
                  },
                  { path: ['execution_time'], mandatory: true, value_type: 'iso_time', display: display('Paid at') },
                  {
                    path: ['notice'],
                    mandatory: false,
                    value_type: 'label_only',
                    display: display('This is a recurring payment'),
                  },
                ],
                ui_labels: {
                  transaction_title: [{ value: 'Set up a standing order' }],
                  affirmative_action_label: [{ value: 'Set up' }],
                  denial_action_label: [{ value: 'Cancel' }],
                },
                ...riskSignals,
              },
            },
          }
        },
      },
    ],
  },
  {
    title: 'Cannot be shown safely',
    scenarios: [
      {
        id: '17',
        title: 'Title of 101 characters',
        expect: 'Refused: the title is one character over the PaSO maximum of 100.',
        request: () => ({
          paso: {
            vcts: kanaal,
            payload: weroPayload(49, { name: 'TurboKeys', id: 'NL857098159B01' }),
            metadata: paymentMetadata({
              ...englishLabels,
              title: ofLength(101, 'Approve this payment to the merchant'),
            }),
          },
        }),
      },
      {
        id: '18',
        title: 'Direction override in payee',
        expect: 'Refused: the payee name contains U+202E RIGHT-TO-LEFT OVERRIDE.',
        request: () => ({
          paso: {
            vcts: wpa,
            payload: weroPayload(49, { name: 'TurboKeys ‮dnuf eerf', id: 'NL857098159B01' }),
          },
        }),
      },
      {
        id: '19',
        title: 'Logo with the wrong integrity',
        expect: 'Refused: the payee logo does not match its logo#integrity.',
        request: () => ({
          paso: {
            vcts: wpa,
            payload: weroPayload(49, {
              name: 'TurboKeys',
              id: 'NL857098159B01',
              logo: `${NEXT_PUBLIC_API_URL}/assets/verifiers/turbokeys/verifier.png`,
              'logo#integrity': 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
            }),
          },
        }),
      },
      {
        id: '20',
        title: 'Unsupported value type',
        expect: "Refused: the currency claim has value_type 'colour', which PaSO does not define.",
        request: () => {
          const metadata = paymentMetadata(englishLabels)
          return {
            paso: {
              vcts: kanaal,
              payload: weroPayload(49, { name: 'TurboKeys', id: 'NL857098159B01' }),
              metadata: {
                ...metadata,
                claims: metadata.claims.map((claim) =>
                  claim.path[0] === 'currency' ? { ...claim, value_type: 'colour' } : claim
                ),
              },
            },
          }
        },
      },
    ],
  },
  {
    title: 'Nothing to pay with',
    scenarios: [
      {
        id: '21',
        title: 'No language match',
        expect: 'Kanaal Bank ad-hoc metadata only in Japanese, no default entries: refused, no language matches.',
        request: () => ({
          paso: {
            vcts: kanaal,
            payload: weroPayload(49, { name: 'TurboKeys', id: 'NL857098159B01' }),
            metadata: paymentMetadata(
              {
                title: '支払いを確認',
                account: '支払口座',
                pay: '支払う',
                cancel: 'キャンセル',
                hint: 'ご自身で開始した支払いのみ確認してください。',
                amount: '金額',
                currency: '通貨',
                payee: '受取人',
                logo: '受取人のロゴ',
              },
              { locale: 'ja' }
            ),
          },
        }),
      },
      {
        id: '22',
        title: 'No matching card',
        expect: 'Asks for a card type nobody holds: the wallet says there is no card to pay with.',
        request: () => ({ paymentAmount: '49.00', paso: { vcts: ['https://example.com/no-such-payment-card'] } }),
      },
    ],
  },
]

const cardOffers = [
  { name: 'Wero Payment Attestation', credentialSupportedId: 'wero-card-paso-sd-jwt' },
  { name: 'Open Horizon Bank debit card', credentialSupportedId: 'open-horizon-debit-card-paso-sd-jwt' },
  { name: 'Kanaal Bank everyday account', credentialSupportedId: 'kanaal-everyday-account-paso-sd-jwt' },
  { name: 'PID', credentialSupportedId: 'eudi-pid-sd-jwt-utopia' },
]

export function PasoEdgeCasesTab() {
  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-8 space-y-2">
        <h3 className="font-semibold text-gray-900 text-xl tracking-tight">PaSO edge cases</h3>
        <p className="text-gray-600 text-sm">
          One request per edge case of the PaSO payment consent screens. Issue the cards first, then create a request
          and scan it. Each scenario says what the wallet should do.
        </p>
      </div>
      <div className="space-y-10">
        <section className="space-y-3">
          <h4 className="font-medium text-gray-900 text-sm">Issue cards</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {cardOffers.map((card) => (
              <OfferPanel key={card.credentialSupportedId} {...card} />
            ))}
          </div>
        </section>
        {scenarioGroups.map((group) => (
          <section key={group.title} className="space-y-3">
            <h4 className="font-medium text-gray-900 text-sm">{group.title}</h4>
            {group.scenarios.map((scenario) => (
              <ScenarioPanel key={scenario.id} scenario={scenario} />
            ))}
          </section>
        ))}
      </div>
    </Card>
  )
}

function OfferPanel({ name, credentialSupportedId }: { name: string; credentialSupportedId: string }) {
  const [offer, setOffer] = useState<CreateOfferReturn>()
  const [offerStatus, setOfferStatus] = useState<OfferStatus>()
  const [error, setError] = useState<string>()
  const isDone = offerStatus?.state === 'Completed' || offerStatus?.state === 'Error'

  useInterval({
    callback: async () => {
      if (offer) setOfferStatus(await getOfferStatus({ issuanceSessionId: offer.issuanceSession.id }))
    },
    interval: 500,
    enabled: offer !== undefined && !isDone,
  })

  const create = async () => {
    setOffer(undefined)
    setOfferStatus(undefined)
    setError(undefined)
    try {
      setOffer(
        await createOffer({
          credentialSupportedId,
          authorization: 'none',
          deferBy: 'none',
          requireKeyAttestation: false,
          requireWalletAttestation: false,
        })
      )
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-gray-900 text-sm">{name}</p>
        <Button type="button" variant="outline" size="sm" onClick={create}>
          Create offer
        </Button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {offer && (
        <WalletLinkPanel
          uri={offer.credentialOffer}
          paradymUri={offer.credentialOffer.replace('openid-credential-offer://', 'id.animo.paradym:')}
          status={offerStatus && offerStatus.state !== 'OfferCreated' ? getOfferProgress(offerStatus) : undefined}
          placeholder=""
        />
      )}
    </div>
  )
}

type RequestStatus = {
  responseStatus: string
  error?: string
  pasoVerification?: PasoVerification
}

function ScenarioPanel({ scenario }: { scenario: Scenario }) {
  const [uri, setUri] = useState<string>()
  const [verificationSessionId, setVerificationSessionId] = useState<string>()
  const [status, setStatus] = useState<RequestStatus>()
  const [sent, setSent] = useState<ScenarioRequest>()
  const [error, setError] = useState<string>()
  const hasResponse = status?.responseStatus === 'ResponseVerified' || status?.responseStatus === 'Error'

  useInterval({
    callback: async () => {
      if (verificationSessionId) setStatus(await getRequestStatus({ verificationSessionId }))
    },
    interval: 500,
    enabled: verificationSessionId !== undefined && !hasResponse,
  })

  const create = async () => {
    setUri(undefined)
    setVerificationSessionId(undefined)
    setStatus(undefined)
    setError(undefined)
    try {
      const body = await scenario.request()
      setSent(body)
      const request = await createRequest({
        requestSignerType: 'x5c',
        requestScheme: 'openid4vp://',
        responseMode: 'direct_post.jwt',
        transactionAuthorizationType: 'paso-payment',
        ...body,
      })
      setUri(request.authorizationRequestUri)
      setVerificationSessionId(request.verificationSessionId)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-gray-900 text-sm">
            <span className="mr-2 font-mono text-gray-400">{scenario.id}</span>
            {scenario.title}
          </p>
          <p className="text-gray-600 text-sm">{scenario.expect}</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={create}>
          Create request
        </Button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {uri && !hasResponse && (
        <WalletLinkPanel
          uri={uri}
          paradymUri={uri.replace('openid4vp://', 'id.animo.paradym:')}
          status={
            status?.responseStatus === 'RequestUriRetrieved'
              ? 'Authorization request has been retrieved. Waiting for response...'
              : undefined
          }
          placeholder=""
        />
      )}
      {status && hasResponse && (
        <Alert variant={status.responseStatus === 'ResponseVerified' ? 'success' : 'warning'}>
          {status.responseStatus === 'ResponseVerified' ? (
            <CheckboxIcon className="h-5 w-5" />
          ) : (
            <ExclamationTriangleIcon className="h-4 w-4" />
          )}
          <AlertTitle className="mt-0.5">
            {status.responseStatus === 'ResponseVerified' ? 'Verification Successful' : 'Verification Unsuccessful'}
          </AlertTitle>
          {status.error && <AlertDescription className="mt-2">{status.error}</AlertDescription>}
        </Alert>
      )}
      {status?.pasoVerification && <PasoVerificationResult verification={status.pasoVerification} />}
      {sent && uri && (
        <CollapsibleSection title="Sent to /api/requests/create">
          <HighLight code={JSON.stringify(sent, null, 2)} language="json" />
        </CollapsibleSection>
      )}
    </div>
  )
}
