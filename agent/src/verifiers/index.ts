import type { PlaygroundVerifierOptions } from '../verifier'
import { bundesregierungVerifier } from './bundesregierung'
import { cheapCarsVerifier } from './cheapCars'
import { europeanUnionVerifier } from './europeanUnion'
import { farmatecVerifier } from './farmatec'
import { kvkVerifier } from './kvk'
import { openHorizonBankVerifier } from './openHorizonBank'
import { pgeuVerifier } from './pgeu'
import { redcarePharmacyVerifier } from './redcarePharmacy'
import type { TrustChain } from './trustChains'
import { trustPilotVerifier } from './trustPilot'
import { turboKeysVerifier } from './turboKeys'

export const verifiers = [
  turboKeysVerifier,
  kvkVerifier,
  trustPilotVerifier,
  openHorizonBankVerifier,
  bundesregierungVerifier,
  cheapCarsVerifier,
  redcarePharmacyVerifier,
  farmatecVerifier,
  pgeuVerifier,
  europeanUnionVerifier,
]
export const allDefinitions = verifiers.flatMap((v): Array<PlaygroundVerifierOptions['requests'][number]> => v.requests)

export const verifierTrustChains = [
  // --- Turbo keys ---
  {
    // Turbo keys is trusted by kvk
    leaf: turboKeysVerifier.verifierId,
    trustAnchor: kvkVerifier.verifierId,
  },
  {
    // Turbo keys is trusted by trust pilot
    leaf: turboKeysVerifier.verifierId,
    trustAnchor: trustPilotVerifier.verifierId,
  },
  // --- Trust pilot ---
  {
    // Trust pilot is trusted by kvk
    leaf: trustPilotVerifier.verifierId,
    trustAnchor: kvkVerifier.verifierId,
  },
  // --- Open horizon bank ---
  {
    // Open horizon bank is trusted by bundesregierung
    leaf: openHorizonBankVerifier.verifierId,
    trustAnchor: bundesregierungVerifier.verifierId,
  },
  // --- Redcare pharmacy ---
  {
    // Redcare pharmacy is trusted by kvk
    leaf: redcarePharmacyVerifier.verifierId,
    trustAnchor: kvkVerifier.verifierId,
  },
  {
    // Redcare pharmacy is trusted by farmatec
    leaf: redcarePharmacyVerifier.verifierId,
    trustAnchor: farmatecVerifier.verifierId,
  },
  {
    // Redcare pharmacy is trusted by pgeu
    leaf: redcarePharmacyVerifier.verifierId,
    trustAnchor: pgeuVerifier.verifierId,
  },
  // --- Pgeu ---
  {
    // Pgeu is trusted by european union
    leaf: pgeuVerifier.verifierId,
    trustAnchor: europeanUnionVerifier.verifierId,
  },
  // --- Bundesregierung ---
  {
    // Bundesregierung is trusted by european union
    leaf: bundesregierungVerifier.verifierId,
    trustAnchor: europeanUnionVerifier.verifierId,
  },
] as const satisfies Array<TrustChain>
