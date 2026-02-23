import type { DcqlQuery, NonEmptyArray } from '@credo-ts/core'

export function findCredentials(
  credentials: DcqlQuery['credentials'],
  toFind: { vcts?: string[]; doctypes?: string[] }
) {
  return credentials.filter((it) => {
    if (it.meta && 'vct_values' in it.meta && toFind.vcts) {
      for (const pid of toFind.vcts) {
        if (it.meta.vct_values?.includes(pid)) return true
      }
    }
    if (it.meta && 'doctype_value' in it.meta && it.meta.doctype_value && toFind.doctypes) {
      return toFind.doctypes.includes(it.meta.doctype_value)
    }
    return false
  })
}

/**
 * Adds a new credential set with OR relationship
 */
export function addOneOfCredentials(
  query: DcqlQuery,
  newCredentials: DcqlQuery['credentials'][number][],
  options?: { position?: 'append' | 'prepend' }
) {
  if (newCredentials.length === 0) return

  const position = options?.position ?? 'append'
  const existingIds = query.credentials.map((c) => c.id)
  if (!query.credential_sets || query.credential_sets.length === 0) {
    query.credential_sets = [{ options: [existingIds], required: true }]
  }
  const newIds = newCredentials.map((c) => c.id)
  for (const credential of newCredentials) {
    if (existingIds.includes(credential.id)) {
      throw new Error(`Credential ID '${credential.id}' already exists in the query.`)
    }
    // biome-ignore lint/suspicious/noExplicitAny: match existing pattern
    query.credentials.push(credential as any)
  }
  const newSet = {
    options: newIds.map((it) => [it]) as NonEmptyArray<string[]>,
    required: true,
  }
  if (position === 'prepend') {
    query.credential_sets.unshift(newSet)
  } else {
    query.credential_sets.push(newSet)
  }
}
