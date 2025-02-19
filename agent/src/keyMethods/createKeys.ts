import { KeyType, TypedArrayEncoder } from '@credo-ts/core'
import { agent } from '../agent'
import { DCS_P256_SEED, ROOT_P256_SEED } from '../constants'

export async function createKeys() {
  const authorityKey = await agent.wallet.createKey({
    keyType: KeyType.P256,
    seed: TypedArrayEncoder.fromString(ROOT_P256_SEED),
  })

  const documentSignerKey = await agent.wallet.createKey({
    keyType: KeyType.P256,
    seed: TypedArrayEncoder.fromString(DCS_P256_SEED),
  })

  return { authorityKey, documentSignerKey }
}
