const pending = new Map<string, Record<string, unknown>>()

export function setPendingCredentialResponseMetadata(accessTokenHash: string, metadata: Record<string, unknown>) {
  pending.set(accessTokenHash, metadata)
}

export function popPendingCredentialResponseMetadata(accessTokenHash: string): Record<string, unknown> | undefined {
  const value = pending.get(accessTokenHash)
  pending.delete(accessTokenHash)
  return value
}
