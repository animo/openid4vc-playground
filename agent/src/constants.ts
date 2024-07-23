if (!process.env.P256_SEED || !process.env.AGENT_HOST || !process.env.AGENT_WALLET_KEY) {
  throw new Error('P256_SEED, AGENT_HOST or AGENT_WALLET_KEY env variable not set')
}

const AGENT_HOST = process.env.AGENT_HOST
const AGENT_WALLET_KEY = process.env.AGENT_WALLET_KEY

const P256_SEED = process.env.P256_SEED

export { AGENT_HOST, AGENT_WALLET_KEY, P256_SEED }
