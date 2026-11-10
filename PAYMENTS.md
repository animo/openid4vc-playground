# PaSO payments

The playground authorizes payments with [PaSO](https://aptitude-consortium.github.io/payments-and-sca-for-openid/draft-2/)
— Payments and SCA for OpenID — using the Basic Payments rulebook, `urn:paso:sca:global:payment:1`.

It is issuer, Relying Party and Authorizing Party at once, which is a first-party flow in PaSO terms:
it verifies the proof against its own issued metadata, and it holds the key that decrypts the risk
signals.

Base URL: `https://playground.animo.id`.

## 1. Get a card

**Issue** tab → **Payment Attestation** → Specification **PaSO**. Leave the rest as is, submit, and
scan the QR with Paradym Wallet.

The PaSO card is a Wero Payment Attestation (WPA) as defined by the WPA Attestation Rulebook v1.0:
`vct` `https://wero.epicompany.eu/payment_attestation/v1`, the claims `category`, `sub`, `masked_iban`
and `psu_id`, none of them selectively disclosable, bound to a P-256 key. At issuance the
wallet also fetches and verifies the issuer's signed credential metadata, which is what later lets it
display the payment and encrypt the risk signals.

The Issue tab issues it as Open Horizon Bank's **Personal Debit Card**, the same WPA with the bank's
own design. Its `vct`,
`https://playground.animo.id/api/vct/7cc028a3-8ce2-432a-bf19-5621068586df/open-horizon-debit-card-paso-sd-jwt`, extends the WPA `vct` and
carries an SVG template of the card with the masked IBAN, one per locale. The WPA publisher doesn't serve the WPA type
metadata yet, so this deployment serves it at `/api/vct/wero/payment_attestation/v1`, and wallets map
the WPA `vct` there for now. Checks for a WPA follow the `extends` chain.

To issue the card with your own values, such as a different masked IBAN, pass `claims` when you
create the offer over the API. See [Issue a card](#issue-a-card).

## 2. Request a payment

**Verify** tab:

1. Select the **Payment Attestation** card and choose Specification **PaSO**. That makes the request a
   PaSO payment, the only thing the rulebook allows the WPA to authorize.
2. **Amount (EUR)** → e.g. `42.50`.
3. **Initiation Method** → **QR / Deeplink**, or **Digital Credentials API** to ask the wallet through
   the browser. The card is an SD-JWT, so the protocol is OpenID4VP.
4. **Request Signer Type** → `x509 Certificate`. PaSO rejects unsigned requests, so this is mandatory.
5. Create the request. Scan the QR, or pick the wallet in the browser's prompt.

The TurboKeys merchant always requests the payment, so the wallet shows TurboKeys and its logo as
the payee.

Over the Digital Credentials API the signed request carries `expected_origins` with the page's origin.
The wallet's response comes back to the page, which posts it to the API for verification and shows
the same result as with a QR.

The wallet shows a dedicated payment screen: amount, payee, payee logo, and the issuer's own labels
and security hint from the signed credential metadata. Approving it signs a Key Binding JWT carrying
the PaSO SCA response claims.

## 3. Read the result

Once the wallet responds, the page shows:

- **PaSO Authorizing Party Verification** — the PaSO checks of [PaSO Proof Verify] Section 3, pass or
  fail: transaction data hash, `request_integrity`, `metadata_integrity`, `jti` replay, payload
  conformance against the Basic Payments rulebook, the risk signals, and the WPA checks of WPA Rulebook
  Section 4.5 (`vct` and `category`, validity window, status, and the issuance record behind `sub`).
  The Wallet Unit Attestation status check is not implemented yet. The request signature, the
  credential and its Key Binding JWT are verified by the OpenID4VP layer before any of these run.
- **Issuer Decrypted Risk Signals** — the plaintext signal envelopes. This deployment publishes an
  encryption key for the payment type, so the wallet encrypts the whole `risk_signals` array to it
  and the value in the KB-JWT is a JWE. Only the holder of the decryption key — here, the same
  process — can show what is inside.
- **Presentations** — the raw presentation, including the KB-JWT the checks ran against.

## API

Everything the UI does is available over HTTP. Base path `https://playground.animo.id/api`.

### Issue a card

```bash
curl -X POST https://playground.animo.id/api/offers/create \
  -H 'Content-Type: application/json' \
  -d '{ "credentialSupportedIds": ["wero-card-paso-sd-jwt"], "authorization": "none" }'
```

```json
{ "credentialOffer": "openid-credential-offer://?credential_offer_uri=…", "issuanceSession": { … } }
```

`claims` replaces or adds claims of the issued credentials, one entry per `credentialSupportedIds`
entry in the same order. Use `{}` to keep a credential's defaults. Here it sets the card's masked IBAN
and PSU id:

```bash
curl -X POST https://playground.animo.id/api/offers/create \
  -H 'Content-Type: application/json' \
  -d '{
    "credentialSupportedIds": ["wero-card-paso-sd-jwt"],
    "authorization": "none",
    "claims": [{ "masked_iban": "DE89**********3000", "psu_id": "my-psu" }]
  }'
```

It works for every credential the playground issues. For an SD-JWT an entry holds top-level claims.
For an mdoc it maps each namespace to its elements, e.g. `{ "org.iso.18013.5.1": { "given_name": "Erika" } }`.
An mdoc value takes the type of the default element it replaces, so `"1990-02-03"` for `birth_date`
is issued as a full-date, and a portrait is passed as base64. New elements keep their JSON type.
Claims that don't fit the credential, such as an invalid date, come back as a 400.

The card always gets a fresh `sub`, whatever you pass, because the Authorizing Party looks the card up
by it. To test a rejected payment, pass a different `category`: it fails the WPA check.

### Create a payment request

```bash
curl -X POST https://playground.animo.id/api/requests/create \
  -H 'Content-Type: application/json' \
  -d '{
    "requestSignerType": "x5c",
    "requestScheme": "openid4vp://",
    "responseMode": "direct_post.jwt",
    "transactionAuthorizationType": "paso-payment",
    "paymentAmount": "42.50",
    "request": {
      "combination": "all",
      "credentials": [
        { "id": "wero-card-paso", "formats": ["dc+sd-jwt"], "attributes": ["category", "sub", "masked_iban"] }
      ]
    }
  }'
```

```json
{
  "authorizationRequestUri": "openid4vp://?client_id=x509_hash%3A…&request_uri=…",
  "verificationSessionId": "9ac2c53a-2c29-4db7-a304-ca3cff44eed1",
  "responseStatus": "RequestCreated",
  "authorizationRequest": { "header": { … }, "payload": { … }, "jwt": "eyJhbGciOi…" },
  "dcqlQuery": { … }
}
```

`requestSignerType: "x5c"` and a `paymentAmount` are both required — a body without either comes back
as a 400 with a `message`, because no conforming wallet would accept the request it describes.
`responseMode: "direct_post.jwt"` encrypts the response to the verifier, which is what you want for a
payment. Turn `authorizationRequestUri` into a QR or a deeplink.

`request.credentials[].id` takes any id from `GET /api/verifier`, so a payment can be combined with
other credentials — `eudi-pid`, `mdl`, … — using `"combination": "all"`. `verifierId` can't be set
for a payment, as TurboKeys always requests it.

`authorizationRequest` is the request as the wallet gets it: the decoded header and payload, and
`jwt`, the signed request itself.

### Request a payment over the Digital Credentials API

Use `"responseMode": "dc_api.jwt"`, and set `origin` to the origin of the page that calls the Digital
Credentials API. The signed request carries it as `expected_origins`. Without `origin` the API uses
the `Origin` header, and with neither it returns a 400. The API sends no CORS headers, so make both
calls from your backend.

```bash
curl -X POST https://playground.animo.id/api/requests/create \
  -H 'Content-Type: application/json' \
  -d '{ …the body above…, "responseMode": "dc_api.jwt", "origin": "https://shop.example" }'
```

The page passes `authorizationRequestObject` from the response to the browser:

```js
const credential = await navigator.credentials.get({
  digital: { requests: [{ protocol: 'openid4vp-v1-signed', data: authorizationRequestObject }] },
  mediation: 'required',
})
```

Post `credential.data` back with the same `origin`. The presentations are bound to the page's origin,
and the verifier checks them against it:

```bash
curl -X POST https://playground.animo.id/api/requests/verify-dc \
  -H 'Content-Type: application/json' \
  -d '{ "verificationSessionId": "9ac2c53a-…", "data": { "response": "eyJhbGciOi…" }, "origin": "https://shop.example" }'
```

The response has the same body as the poll result below.

### Poll the result

```bash
curl https://playground.animo.id/api/requests/9ac2c53a-2c29-4db7-a304-ca3cff44eed1
```

Before the wallet responds you get `responseStatus: "RequestCreated"`. Afterwards the body grows the
verification output:

```json
{
  "responseStatus": "ResponseVerified",
  "presentations": ["eyJhbGciOi…~eyJhbGciOi…"],
  "pasoVerification": {
    "accepted": true,
    "checks": [
      { "check": "transaction_data_hash", "passed": true, "detail": "Matches the transaction data entry in the request" },
      { "check": "risk_signals_encrypted", "passed": true, "detail": "A JWE compact string, as this transaction data type requires" },
      { "check": "risk_signal:urn:paso:risk:global:amr:1", "passed": true, "detail": "Reported pin, hwk — 2 of the three [PSD2] factor categories" }
    ],
    "decryptedRiskSignals": [
      { "type": "urn:paso:risk:global:amr:1", "collected_at": "2026-09-25T08:49:41.752Z", "status": "ok", "value": ["pin", "hwk"] }
    ]
  }
}
```

`accepted` is false if any check failed — PaSO has the Authorizing Party reject the transaction then.

### Issuer metadata and trust

```bash
# The signed credential metadata JWT: transaction data types, labels, risk signal
# declarations, and the risk_signals_encryption_keys JWK set. Both headers are required.
curl -H 'Accept: application/jwt' -H 'Accept-Language: en' \
  https://playground.animo.id/api/paso-credential-metadata

# The root certificate the request signature chains to
curl https://playground.animo.id/api/x509
```

Ask for `Accept: application/json` to get the same document unsigned, for reading. A wallet may not
rely on that form — the unsigned key is not integrity-verified, so PaSO treats it as absent.

## Worth knowing

- **`amr` is the SCA evidence.** The payment type requires `urn:paso:risk:global:amr:1`, and the
  Authorizing Party accepts it only when the wallet reports two of the three [PSD2] factor
  categories — knowledge (`pin`, `pwd`), possession (`hwk`, `swk`, `otp`), inherence (`bio_*`).
- **A payment ends at `accepted`.** PaSO defines no status or settlement backchannel, so there is
  nothing to poll after the verification result. Whether the payment then settles is the scheme's
  business, not the wallet's.
