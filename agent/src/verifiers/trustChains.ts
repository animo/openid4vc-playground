export type EntityId = string

export type TrustChain = {
  leaf: EntityId
  intermediates?: Array<EntityId>
  trustAnchor: EntityId
}

export const flattenTrustChains = (trustChain: TrustChain) => {
  return [trustChain.leaf, ...(trustChain.intermediates ?? []), trustChain.trustAnchor]
}

export const isSubordinateTo = (trustChains: Array<TrustChain>, issuer: EntityId, subject: EntityId) => {
  // We only want to check one index so if the subject is directly under the issuer
  // return chain.indexOf(issuer) + 1 === chain.indexOf(subject)

  const subjectVerifierId = subject.split('/').pop()
  if (!subjectVerifierId) {
    throw new Error('Subject verifier id not found')
  }

  return trustChains
    .map(flattenTrustChains)
    .filter((chain) => chain.includes(issuer) && chain.includes(subjectVerifierId))
    .flatMap((chain) => {
      const indexIssuer = chain.indexOf(issuer)
      const indexSubject = chain.indexOf(subjectVerifierId)

      // TODO: Not sure if this is correct
      return indexIssuer === indexSubject - 1
    })
}

export const getAuthorityHints = (trustChains: Array<TrustChain>, entityId: EntityId) => {
  return trustChains
    .map(flattenTrustChains)
    .filter((chain) => chain.includes(entityId))
    .flatMap((chain) => {
      const index = chain.indexOf(entityId)

      return chain[index + 1] ?? []
    })
}
