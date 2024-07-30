import { createECDH, createHmac } from 'crypto'
import { assertAskarWallet } from '@credo-ts/askar/build/utils/assertAskarWallet'
import type { AgentContext, Key, P256Jwk } from '@credo-ts/core'

const getPrivateKeyFromAskar = async (context: AgentContext, keyId: string) => {
  const wallet = context.wallet
  assertAskarWallet(wallet)

  const secretJwk = await wallet.withSession(
    async (session) => (await session.fetchKey({ name: keyId }))?.key.jwkSecret
  )

  if (!secretJwk.d) {
    throw new Error('JWK does not contain a `d` param')
  }

  return Buffer.from(secretJwk.d, 'base64')
}

const getPublicKeyFromJwk = async (jwk: P256Jwk) => {
  const key = Buffer.concat([Buffer.from([0x04]), Buffer.from(jwk.x, 'base64'), Buffer.from(jwk.y, 'base64')])

  return key
}

const createMac = (privateKey: Buffer, publicKey: Buffer, message: Buffer) => {
  const ecdh = createECDH('prime256v1')
  ecdh.setPrivateKey(privateKey)
  const sharedSecret = ecdh.computeSecret(publicKey)

  // Spec does not define SHA-256, can be a cause if the mac is invalid
  return createHmac('sha256', sharedSecret).update(message).digest()
}

const diffieHellmanKeyExchangeAndVerify = async ({
  message,
  context,
  myKey,
  theirKey,
  mac,
}: {
  context: AgentContext
  myKey: Key
  theirKey: P256Jwk
  mac: Buffer
  message: Buffer
}) => {
  const privateKey = await getPrivateKeyFromAskar(context, myKey.publicKeyBase58)

  const publicKey = await getPublicKeyFromJwk(theirKey)

  const ourMac = createMac(privateKey, publicKey, message).toString('hex')

  return mac.toString('hex') === ourMac
}

export const dhke = {
  verify: diffieHellmanKeyExchangeAndVerify,
}
