import { Hasher, TypedArrayEncoder } from '@credo-ts/core'

/**
 * Helpers for serving PaSO signed credential metadata.
 *
 * https://aptitude-consortium.github.io/payments-and-sca-for-openid/draft-2/specifications/proof/paso-proof-metadata/
 */

/** The locales the Attestation Provider serves for its PaSO transaction data types. */
export const pasoSupportedLocales = ['en', 'de', 'nl']

/** [W3C.SRI] integrity value — standard base64, not base64url. */
export function computeSriIntegrity(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? TypedArrayEncoder.fromUtf8String(data) : data
  return `sha256-${TypedArrayEncoder.toBase64(Hasher.hash(bytes, 'sha-256'))}`
}

/** [RFC4647] Section 3.4 Lookup — truncate the range until an available tag matches exactly. */
export function lookupLanguageTag(range: string, availableTags: string[]): string | undefined {
  const available = availableTags.map((tag) => tag.toLowerCase())
  let candidate = range.toLowerCase()

  while (candidate.length > 0) {
    const index = available.indexOf(candidate)
    if (index !== -1) return availableTags[index]

    const lastSeparator = candidate.lastIndexOf('-')
    if (lastSeparator === -1) return undefined
    candidate = candidate.slice(0, lastSeparator)

    const precedingSeparator = candidate.lastIndexOf('-')
    if (precedingSeparator !== -1 && candidate.length - precedingSeparator === 2) {
      candidate = candidate.slice(0, precedingSeparator)
    }
  }

  return undefined
}

/**
 * Which locales this JWT will cover, given the wallet's `Accept-Language`.
 *
 * [PaSO Proof Metadata] Section 2: the provider "SHALL include at least the first supported locale
 * from the `Accept-Language` header and MAY include additional locales". We serve exactly the
 * supported locales the wallet asked for, in its order of preference — enough for the wallet's
 * locale selection to succeed, and narrow enough that the choice is visible in the resulting JWT
 * rather than hidden behind serving everything to everyone.
 */
export function resolvePasoServedLocales(acceptLanguage: string): string[] {
  const requested = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...parameters] = part.trim().split(';')
      const quality = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.startsWith('q='))
        ?.slice(2)
      return { tag: tag.trim(), quality: quality === undefined ? 1 : Number.parseFloat(quality) }
    })
    .filter(({ tag, quality }) => tag.length > 0 && quality > 0)
    .sort((a, b) => b.quality - a.quality)

  const served: string[] = []
  for (const { tag } of requested) {
    if (tag === '*') {
      for (const locale of pasoSupportedLocales) if (!served.includes(locale)) served.push(locale)
      continue
    }
    const matched = lookupLanguageTag(tag, pasoSupportedLocales)
    if (matched && !served.includes(matched)) served.push(matched)
  }

  return served
}

type LocalisedEntry = { locale?: string }

function restrictLocalisedArray<Entry extends LocalisedEntry>(entries: Entry[], locales: string[]): Entry[] {
  const restricted = entries.filter((entry) => entry.locale === undefined || locales.includes(entry.locale))
  // Never hand back an empty `display` array: [PaSO View] Section 4 would read that as "no match for
  // this locale" and the wallet would exclude the credential rather than fall back.
  return restricted.length > 0 ? restricted : entries
}

/**
 * Narrows every `display` and `ui_labels` array of the metadata to the served locales.
 *
 * [PaSO Proof Metadata] Section 3.1: claims relevant to consent must carry `display` entries "for
 * the locales served in that signed JWT" — so what is served and what is declared have to agree.
 */
export function restrictPasoMetadataToLocales<T extends Record<string, unknown>>(metadata: T, locales: string[]): T {
  const transactionDataTypes = metadata.transaction_data_types as Record<string, Record<string, unknown>>

  return {
    ...metadata,
    display: Array.isArray(metadata.display)
      ? restrictLocalisedArray(metadata.display as LocalisedEntry[], locales)
      : metadata.display,
    transaction_data_types: Object.fromEntries(
      Object.entries(transactionDataTypes).map(([type, typeMetadata]) => [
        type,
        {
          ...typeMetadata,
          claims: (typeMetadata.claims as Array<{ display?: LocalisedEntry[] }>).map((claim) =>
            claim.display ? { ...claim, display: restrictLocalisedArray(claim.display, locales) } : claim
          ),
          ui_labels: typeMetadata.ui_labels
            ? Object.fromEntries(
                Object.entries(typeMetadata.ui_labels as Record<string, LocalisedEntry[]>).map(([key, entries]) => [
                  key,
                  restrictLocalisedArray(entries, locales),
                ])
              )
            : undefined,
        },
      ])
    ),
  } as T
}
