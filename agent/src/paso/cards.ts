import { Hasher, TypedArrayEncoder } from '@credo-ts/core'
import {
  kanaalBankIssuerId,
  kanaalBankTransactionDataTypes,
  kanaalEverydayAccountConfiguration,
} from '../issuers/kanaalBank.js'
import {
  openHorizonBankTransactionDataTypes,
  openHorizonDebitCardConfiguration,
  openHorizonIssuerId,
  weroPasoConfiguration,
} from '../issuers/openHorizonBank.js'
import { getX509DcsCertificate } from '../keyMethods/index.js'

/**
 * The PaSO Credentials this playground issues, each with the signed credential metadata it is served
 * under at its own `credential_metadata_uri`.
 *
 * `isWpa` marks a Wero Payment Attestation, which the WPA Rulebook checks apply to. The Open Horizon
 * debit card is one too: its own `vct` extends the WPA's.
 */
export const pasoCards = {
  'wero-payment-attestation': {
    issuerId: openHorizonIssuerId,
    configuration: weroPasoConfiguration,
    isWpa: true,
    acceptsAdhocMetadata: false,
    transactionDataTypes: openHorizonBankTransactionDataTypes,
  },
  'open-horizon-debit-card': {
    issuerId: openHorizonIssuerId,
    configuration: openHorizonDebitCardConfiguration,
    isWpa: true,
    acceptsAdhocMetadata: false,
    transactionDataTypes: openHorizonBankTransactionDataTypes,
  },
  'kanaal-bank': {
    issuerId: kanaalBankIssuerId,
    configuration: kanaalEverydayAccountConfiguration,
    isWpa: false,
    acceptsAdhocMetadata: true,
    transactionDataTypes: kanaalBankTransactionDataTypes,
  },
}

export type PasoCardId = keyof typeof pasoCards

export const pasoCardIds = Object.keys(pasoCards) as PasoCardId[]

export const findPasoCardIdByVct = (vct: unknown) => pasoCardIds.find((id) => pasoCards[id].configuration.vct === vct)

export const findPasoCardByScope = (scope: string) =>
  Object.values(pasoCards).find((card) => card.configuration.scope === scope)

/**
 * The `client_id` of every request the playground signs. All its verifiers sign with the one Document
 * Signer certificate, so they share it.
 */
export function getPlaygroundRequestClientId() {
  const hash = Hasher.hash(getX509DcsCertificate().rawCertificate, 'sha-256')
  return `x509_hash:${TypedArrayEncoder.toBase64Url(hash)}`
}

/**
 * A card's `credential_metadata`, before it is narrowed to the served locales.
 *
 * [PaSO Proof Metadata] Section 4: this is the full [OID4VCI] `credential_metadata` object, and
 * Section 3 has the wallet use nothing unsigned for a PaSO Credential, so the card branding and claim
 * labels have to be in here. `adhoc_metadata_clients` is Section 5.2.
 */
export function getPasoCardCredentialMetadata(cardId: PasoCardId) {
  const { configuration, transactionDataTypes, acceptsAdhocMetadata } = pasoCards[cardId]
  return {
    display: configuration.credential_metadata.display,
    claims: configuration.credential_metadata.claims,
    transaction_data_types: transactionDataTypes,
    adhoc_metadata_clients: acceptsAdhocMetadata ? [getPlaygroundRequestClientId()] : undefined,
  }
}
