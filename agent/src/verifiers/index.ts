import type { PlaygroundVerifierOptions } from '../verifier'
import { animoVerifier } from './animo'
import { kvkVerifier } from './kvk'
import { turboKeysVerifier } from './sixt'
import type { TrustChain } from './trustChains'
import { trustPilotVerifier } from './trustPilot'

export const verifiers = [animoVerifier, turboKeysVerifier, kvkVerifier, trustPilotVerifier]
export const allDefinitions = verifiers.flatMap(
  (
    v
  ): Array<
    PlaygroundVerifierOptions['presentationRequests'][number] | PlaygroundVerifierOptions['dcqlRequests'][number]
  > => [...v.presentationRequests, ...v.dcqlRequests]
)

export const verifierTrustChains = [
  {
    leaf: turboKeysVerifier.verifierId,
    trustAnchor: kvkVerifier.verifierId,
  },
  {
    leaf: turboKeysVerifier.verifierId,
    trustAnchor: trustPilotVerifier.verifierId,
  },
  {
    leaf: trustPilotVerifier.verifierId,
    trustAnchor: kvkVerifier.verifierId,
  },
] as const satisfies Array<TrustChain>
