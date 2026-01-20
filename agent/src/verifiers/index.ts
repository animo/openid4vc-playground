import type { PlaygroundVerifierOptions } from '../verifier.js'
import { europeanUnionVerifier } from './europeanUnion.js'
import { farmatecVerifier } from './farmatec.js'
import { kvkVerifier } from './kvk.js'
import { pgeuVerifier } from './pgeu.js'
import { redcarePharmacyVerifier } from './redcarePharmacy.js'
import type { TrustChain } from './trustChains.js'
import { trustPilotVerifier } from './trustPilot.js'
import { turboKeysVerifier } from './turboKeys.js'
import { utopiaGovernmentVerifier } from './utopiaGovernment.js'

export const verifiers = [
  utopiaGovernmentVerifier,
  // turboKeysVerifier,
  // kvkVerifier,
  // trustPilotVerifier,
  // openHorizonBankVerifier,
  // redcarePharmacyVerifier,
  // farmatecVerifier,
  // pgeuVerifier,
  // europeanUnionVerifier,
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
] as const satisfies Array<TrustChain>
