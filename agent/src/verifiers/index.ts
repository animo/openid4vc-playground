import type { PlaygroundVerifierOptions } from '../verifier'
import { animoVerifier } from './animo'
import { sixtVerifier } from './sixt'

export const verifiers = [animoVerifier, sixtVerifier]
export const allDefinitions = verifiers.flatMap(
  (
    v
  ): Array<
    PlaygroundVerifierOptions['presentationRequests'][number] | PlaygroundVerifierOptions['dcqlRequests'][number]
  > => [...v.presentationRequests, ...v.dcqlRequests]
)
