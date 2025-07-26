import { transformSeedToPrivateJwk } from '@credo-ts/askar'
import { Kms, TypedArrayEncoder } from '@credo-ts/core'
import { agent } from '../agent'
import { DCS_P256_SEED, ROOT_P256_SEED } from '../constants'

export async function createKeys() {
  const { privateJwk: authorityPrivateJwk } = transformSeedToPrivateJwk({
    type: { kty: 'EC', crv: 'P-256' },
    seed: TypedArrayEncoder.fromString(ROOT_P256_SEED),
  })

  const { publicJwk: authorityPublicJwk } = await agent.kms.importKey({
    privateJwk: authorityPrivateJwk,
  })

  const { privateJwk: documentSignerPrivateJwk } = transformSeedToPrivateJwk({
    type: { kty: 'EC', crv: 'P-256' },
    seed: TypedArrayEncoder.fromString(DCS_P256_SEED),
  })
  const { publicJwk: documentSignerPublicJwk } = await agent.kms.importKey({
    privateJwk: documentSignerPrivateJwk,
  })

  return {
    authorityPublicJwk: Kms.PublicJwk.fromPublicJwk(authorityPublicJwk),
    documentSignerPublicJwk: Kms.PublicJwk.fromPublicJwk(documentSignerPublicJwk),
  }
}
