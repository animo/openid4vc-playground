import { createECDH, createHmac, hkdfSync } from 'crypto'
import { assertAskarWallet } from '@credo-ts/askar/build/utils/assertAskarWallet'
import {
  type AgentContext,
  type JwkJson,
  Key,
  KeyType,
  type P256Jwk,
  TypedArrayEncoder,
  X509Service,
  getJwkFromJson,
  getJwkFromKey,
} from '@credo-ts/core'

const createMac = (privateKey: Buffer, publicKey: Buffer, message: Buffer) => {
  const info = Buffer.from('DVS-1')
  const salt = Buffer.from('')

  const ecdh = createECDH('prime256v1')
  ecdh.setPrivateKey(Buffer.from(privateKey))
  const dh = ecdh.computeSecret(publicKey)

  const derivedSecret = hkdfSync('sha256', dh, salt, info, 32)

  return createHmac('sha256', Buffer.from(derivedSecret)).update(message).digest()
}

const getPrivateKeyFromAskar = async (context: AgentContext, keyId: string) => {
  const wallet = context.wallet
  assertAskarWallet(wallet)

  const secretJwk = await wallet.withSession(
    async (session) => (await session.fetchKey({ name: keyId }))?.key.jwkSecret
  )

  if (!secretJwk?.d) {
    throw new Error('JWK does not contain a `d` param')
  }

  return Buffer.from(secretJwk.d, 'base64')
}

const getPublicKeyFromJwk = async (jwk: P256Jwk) => {
  const key = Buffer.concat([Buffer.from([0x04]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')])

  return key
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
// https://demo.pid-issuer.bundesdruckerei.de
const bdrPidIssuerCertificate = `-----BEGIN CERTIFICATE-----
MIICdDCCAhugAwIBAgIBAjAKBggqhkjOPQQDAjCBiDELMAkGA1UEBhMCREUxDzANBgNVBAcMBkJlcmxpbjEdMBsGA1UECgwUQnVuZGVzZHJ1Y2tlcmVpIEdtYkgxETAPBgNVBAsMCFQgQ1MgSURFMTYwNAYDVQQDDC1TUFJJTkQgRnVua2UgRVVESSBXYWxsZXQgUHJvdG90eXBlIElzc3VpbmcgQ0EwHhcNMjQwNTMxMDgxMzE3WhcNMjUwNzA1MDgxMzE3WjBsMQswCQYDVQQGEwJERTEdMBsGA1UECgwUQnVuZGVzZHJ1Y2tlcmVpIEdtYkgxCjAIBgNVBAsMAUkxMjAwBgNVBAMMKVNQUklORCBGdW5rZSBFVURJIFdhbGxldCBQcm90b3R5cGUgSXNzdWVyMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEOFBq4YMKg4w5fTifsytwBuJf/7E7VhRPXiNm52S3q1ETIgBdXyDK3kVxGxgeHPivLP3uuMvS6iDEc7qMxmvduKOBkDCBjTAdBgNVHQ4EFgQUiPhCkLErDXPLW2/J0WVeghyw+mIwDAYDVR0TAQH/BAIwADAOBgNVHQ8BAf8EBAMCB4AwLQYDVR0RBCYwJIIiZGVtby5waWQtaXNzdWVyLmJ1bmRlc2RydWNrZXJlaS5kZTAfBgNVHSMEGDAWgBTUVhjAiTjoDliEGMl2Yr+ru8WQvjAKBggqhkjOPQQDAgNHADBEAiAbf5TzkcQzhfWoIoyi1VN7d8I9BsFKm1MWluRph2byGQIgKYkdrNf2xXPjVSbjW/U/5S5vAEC5XxcOanusOBroBbU=
-----END CERTIFICATE-----`

const compressP256PublicKey = (uncompressed: Uint8Array): Uint8Array => {
  if (uncompressed.length !== 65 || uncompressed[0] !== 0x04) {
    throw new Error('Invalid uncompressed P-256 public key')
  }

  const x = uncompressed.slice(1, 33) // Extract x coordinate (32 bytes)
  const y = uncompressed.slice(33, 65) // Extract y coordinate (32 bytes)

  // Determine the prefix: 0x02 if y is even, 0x03 if y is odd
  const prefix = y[y.length - 1] % 2 === 0 ? 0x02 : 0x03

  // Create the compressed key by concatenating the prefix with x
  const compressed = Buffer.concat([Buffer.from([prefix]), x])

  return new Uint8Array(compressed)
}

export const verifyHs256Callback = (context: AgentContext, verifierKey: Record<string, unknown>) => {
  const cert = X509Service.parseCertificate(context, {
    encodedCertificate: bdrPidIssuerCertificate,
  })
  return async (data: Uint8Array, signatureBase64Url: string) => {
    console.error('arrived!')
    const mac = TypedArrayEncoder.fromBase64(signatureBase64Url)

    const jwk = getJwkFromJson(verifierKey as JwkJson)

    const theirKeyBytes = compressP256PublicKey(new Uint8Array(cert.publicKey.publicKey))

    const isValid = await diffieHellmanKeyExchangeAndVerify({
      mac: Buffer.from(mac),
      message: Buffer.from(data),
      myKey: jwk.key,
      theirKey: getJwkFromKey(new Key(theirKeyBytes, KeyType.P256)) as P256Jwk,
      context,
    })

    return isValid
  }
}
