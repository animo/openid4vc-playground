if (
  !process.env.ED25519_SEED ||
  !process.env.P256_SEED ||
  !process.env.AGENT_HOST ||
  !process.env.AGENT_WALLET_KEY
) {
  throw new Error(
    "ED25519_SEED, P256_SEED, AGENT_HOST or AGENT_WALLET_KEY env variable not set"
  );
}

const AGENT_HOST = process.env.AGENT_HOST;
const AGENT_WALLET_KEY = process.env.AGENT_WALLET_KEY;

const CHEQD_TESTNET_COSMOS_PAYER_SEED =
  process.env.CHEQD_TESTNET_COSMOS_PAYER_SEED;

const ED25519_SEED = process.env.ED25519_SEED;
const P256_SEED = process.env.P256_SEED;

export {
  AGENT_HOST,
  AGENT_WALLET_KEY,
  CHEQD_TESTNET_COSMOS_PAYER_SEED,
  ED25519_SEED,
  P256_SEED,
};
