# PaSO payments

The playground authorizes payments with [PaSO](https://aptitude-consortium.github.io/payments-and-sca-for-openid/draft-2/)
— Payments and SCA for OpenID — using the Basic Payments rulebook, `urn:paso:sca:global:payment:1`.

It is issuer, Relying Party and Authorizing Party at once, which is a first-party flow in PaSO terms:
it verifies the proof against its own issued metadata, and it holds the key that decrypts the risk
signals.

Base URL: `https://eudi-payments.animo.id`.

## 1. Get a card

**Issue** tab → issuer **Open Horizon Bank** → **Wero Bank Account (PaSO)**. Leave the rest as is,
submit, and scan the QR with Paradym Wallet.

The PaSO card has its own `vct`, separate from the older cards on the same issuer. At issuance the
wallet also fetches and verifies the issuer's signed credential metadata, which is what later lets it
display the payment and encrypt the risk signals.

## 2. Request a payment

**Verify** tab:

1. Select the **Wero Bank Account (PaSO)** card and its attributes. (Any selection works — the payment
   card is added to the request automatically if you leave it out.)
2. **Transaction Authorization** → `Payment (PaSO)`.
3. **Payment amount (EUR)** → e.g. `42.50`.
4. **Request Signer Type** → `x509 Certificate`. PaSO rejects unsigned requests, so this is mandatory.
5. Create the request and scan the QR.

The wallet shows a dedicated payment screen: amount, payee, payee logo, and the issuer's own labels
and security hint from the signed credential metadata. Approving it signs a Key Binding JWT carrying
the PaSO SCA response claims.

## 3. Read the result

Once the wallet responds, the page shows:

- **PaSO Authorizing Party Verification** — every check of [PaSO Proof Verify] Section 3, pass or fail:
  request signature, transaction data hash, `request_integrity`, `metadata_integrity`, `jti` replay,
  payload conformance against the Basic Payments rulebook, and the risk signals.
- **Issuer Decrypted Risk Signals** — the plaintext signal envelopes. This deployment publishes an
  encryption key for the payment type, so the wallet encrypts the whole `risk_signals` array to it
  and the value in the KB-JWT is a JWE. Only the holder of the decryption key — here, the same
  process — can show what is inside.
- **Presentations** — the raw presentation, including the KB-JWT the checks ran against.

## API

Everything the UI does is available over HTTP. Base path `https://eudi-payments.animo.id/api`.

### Issue a card

```bash
curl -X POST https://eudi-payments.animo.id/api/offers/create \
  -H 'Content-Type: application/json' \
  -d '{ "credentialSupportedIds": ["wero-card-paso-sd-jwt"], "authorization": "none" }'
```

```json
{ "credentialOffer": "openid-credential-offer://?credential_offer_uri=…", "issuanceSession": { … } }
```

### Create a payment request

```bash
curl -X POST https://eudi-payments.animo.id/api/requests/create \
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
        { "id": "wero-card-paso", "formats": ["dc+sd-jwt"], "attributes": ["iban", "bic", "currency", "payment_network"] }
      ]
    }
  }'
```

```json
{
  "authorizationRequestUri": "openid4vp://?client_id=x509_hash%3A…&request_uri=…",
  "verificationSessionId": "9ac2c53a-2c29-4db7-a304-ca3cff44eed1",
  "responseStatus": "RequestCreated",
  "authorizationRequest": { "header": { … }, "payload": { … } },
  "dcqlQuery": { … }
}
```

`requestSignerType: "x5c"` and a `paymentAmount` are both required — a body without either comes back
as a 400 with a `message`, because no conforming wallet would accept the request it describes.
`responseMode: "direct_post.jwt"` encrypts the response to the verifier, which is what you want for a
payment. Turn `authorizationRequestUri` into a QR or a deeplink.

`request.credentials[].id` takes any id from `GET /api/verifier`, so a payment can be combined with
other credentials — `eudi-pid`, `mdl`, … — using `"combination": "all"`.

### Poll the result

```bash
curl https://eudi-payments.animo.id/api/requests/9ac2c53a-2c29-4db7-a304-ca3cff44eed1
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
      { "check": "request_signature", "passed": true, "detail": "Signed by x509_hash:…" },
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

### Forward a proof package

The Transaction Ingestion Endpoint, for a Relying Party that did not create the request:

```bash
curl -X POST https://eudi-payments.animo.id/api/paso/transactions \
  -H 'Content-Type: application/json' \
  -d '{ "signed_request": "eyJhbGciOi…", "vp_token": { "0": ["eyJhbGciOi…"] } }'
```

The `vp_token` keys are the DCQL credential query ids — `"0"`, `"1"`, … in the order the credentials
appear in `dcqlQuery`.

`200` accepted, `400` malformed or a failed check, `409` replayed `jti`. The response carries the
checks, never the decrypted risk signals — handing those back to the Relying Party is exactly what
encrypting them prevents.

### Issuer metadata and trust

```bash
# The signed credential metadata JWT: transaction data types, labels, risk signal
# declarations, and the risk_signals_encryption_keys JWK set. Both headers are required.
curl -H 'Accept: application/jwt' -H 'Accept-Language: en' \
  https://eudi-payments.animo.id/api/paso-credential-metadata

# The root certificate the request signature chains to
curl https://eudi-payments.animo.id/api/x509
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
