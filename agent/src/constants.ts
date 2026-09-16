import { randomUUID } from 'node:crypto'

if (
  !process.env.ROOT_P256_SEED ||
  !process.env.DCS_P256_SEED ||
  !process.env.AGENT_HOST ||
  !process.env.AGENT_WALLET_KEY
) {
  throw new Error('ROOT_P256_SEED, DCS_P256_SEED, AGENT_HOST or AGENT_WALLET_KEY env variable not set')
}

const AGENT_HOST = process.env.AGENT_HOST
const AGENT_DNS = AGENT_HOST.replace('https://', '')
console.log('AGENT_HOST=', AGENT_HOST)
const AGENT_WALLET_KEY = process.env.AGENT_WALLET_KEY

const ROOT_P256_SEED = process.env.ROOT_P256_SEED
const DCS_P256_SEED = process.env.DCS_P256_SEED
const X509_ROOT_CERTIFICATE = process.env.X509_ROOT_CERTIFICATE
const X509_DCS_CERTIFICATE = process.env.X509_DCS_CERTIFICATE

export {
  AGENT_DNS,
  AGENT_HOST,
  AGENT_WALLET_KEY,
  DCS_P256_SEED,
  ROOT_P256_SEED,
  X509_DCS_CERTIFICATE,
  X509_ROOT_CERTIFICATE,
}

export const ISSUER_CLIENT_SECRET = randomUUID()
