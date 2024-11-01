import type { DifPresentationExchangeDefinitionV2 } from '@credo-ts/core'
import { animoVerifier } from './animo'
import { sixtVerifier } from './sixt'

export const verifiers = [animoVerifier, sixtVerifier]
export const allDefinitions = verifiers.flatMap((v): DifPresentationExchangeDefinitionV2[] => v.presentationRequests)
