import { KeyType, TypedArrayEncoder } from '@credo-ts/core'
import { agent } from '../agent'
import { P256_SEED } from '../constants'

export async function createKeys() {
  const p256Key = await agent.wallet.createKey({
    keyType: KeyType.P256,
    seed: TypedArrayEncoder.fromString(P256_SEED),
  })

  return p256Key
}
