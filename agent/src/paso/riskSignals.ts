/**
 * Risk signal profile resolution, per [PaSO Risk Signals] Section 4.1.
 *
 * The Authorizing Party has to perform the *same* resolution as the Wallet — Section 6 step 1 — or
 * the two disagree on which signals were required and the check is worthless. This is therefore a
 * deliberate mirror of the wallet-side implementation, not a shortcut.
 */

interface RiskSignalEntry {
  type: string
  required?: boolean
  max_age?: number
}

interface RiskSignalProfile {
  /** Section 7.2 item 3 — a profile is one of the three things that can require encryption. */
  encrypted?: boolean
  signals: RiskSignalEntry[]
}

export interface ResolvedRiskSignal {
  type: string
  required: boolean
  maxAge?: number
}

export type RiskSignalResolution = {
  signals: ResolvedRiskSignal[]
  encryptionRequired: boolean
  /** Profiles referenced by the metadata that this deployment cannot resolve. */
  unknownProfiles: string[]
}

/**
 * Transcribed from the published profiles; a profile is a governance document, not a fetchable
 * resource (Section 3.3). Which makes transcribing them accurately the whole job — a profile short
 * of a signal has the Authorizing Party accept a proof it should reject.
 */
const knownRiskSignalProfiles: Record<string, RiskSignalProfile> = {
  // https://aptitude-consortium.github.io/payments-and-sca-for-openid/draft-2/rulebooks/risk_profiles/Default/
  //
  // All seven signal types of the registry except `amr`, every one required with a ten-minute
  // freshness bound, and `encrypted: true`.
  'urn:paso:risk-profile:global:default:1': {
    encrypted: true,
    signals: [
      { type: 'urn:paso:risk:global:response_mode:1', required: true, max_age: 600 },
      { type: 'urn:paso:risk:global:geolocation:1', required: true, max_age: 600 },
      { type: 'urn:paso:risk:global:call_activity:1', required: true, max_age: 600 },
      { type: 'urn:paso:risk:global:device_motion:1', required: true, max_age: 600 },
      { type: 'urn:paso:risk:global:screen_capture:1', required: true, max_age: 600 },
      { type: 'urn:paso:risk:global:device_basics:1', required: true, max_age: 600 },
      { type: 'urn:paso:risk:global:app_vendor_id:1', required: true, max_age: 600 },
    ],
  },
}

export function resolveEffectiveRiskSignalSet(
  typeMetadata: { risk_signal_profiles?: string[]; risk_signals?: RiskSignalEntry[]; encrypted?: boolean } | undefined
): RiskSignalResolution {
  const resolved = new Map<string, ResolvedRiskSignal>()
  const unknownProfiles: string[] = []

  // The strictest constraint wins in every case: `required` ORs, `max_age` takes the minimum. That
  // makes unioning profiles and applying the enumeration ratchet the same operation.
  const apply = (entry: RiskSignalEntry) => {
    const existing = resolved.get(entry.type)
    if (!existing) {
      resolved.set(entry.type, { type: entry.type, required: entry.required ?? false, maxAge: entry.max_age })
      return
    }
    existing.required = existing.required || (entry.required ?? false)
    if (entry.max_age !== undefined) {
      existing.maxAge = existing.maxAge === undefined ? entry.max_age : Math.min(existing.maxAge, entry.max_age)
    }
  }

  // Section 7.2 items 1 and 2; item 3, the profiles, is folded in below.
  let encryptionRequired = typeMetadata?.encrypted === true

  for (const profileId of typeMetadata?.risk_signal_profiles ?? []) {
    const profile = knownRiskSignalProfiles[profileId]
    if (!profile) {
      unknownProfiles.push(profileId)
      continue
    }
    if (profile.encrypted) encryptionRequired = true
    for (const entry of profile.signals) apply(entry)
  }

  for (const entry of typeMetadata?.risk_signals ?? []) apply(entry)

  return { signals: [...resolved.values()], encryptionRequired, unknownProfiles }
}
