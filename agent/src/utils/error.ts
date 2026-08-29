export interface SerializedError {
  name: string
  message: string
  stack?: string
}

/**
 * Flatten an error and all its `cause` errors into a list.
 *
 * Most credo errors wrap the actual reason in `cause` (e.g. `Mdoc with doctype x is not valid`
 * only names the document, while the cause names the check that failed), so the cause chain is
 * what you actually want to look at.
 */
export function getErrorChain(error: unknown): SerializedError[] {
  const chain: SerializedError[] = []
  const seen = new Set<unknown>()

  let current: unknown = error
  while (current instanceof Error && !seen.has(current)) {
    seen.add(current)
    chain.push({ name: current.name, message: current.message, stack: current.stack })
    current = (current as { cause?: unknown }).cause
  }

  if (chain.length === 0) {
    chain.push({ name: 'UnknownError', message: String(current) })
  }

  return chain
}

/**
 * Single line representation of an error and all its causes.
 */
export function formatErrorChain(error: unknown): string {
  return getErrorChain(error)
    .map(({ name, message }) => `${name}: ${message}`)
    .join(' <- caused by <- ')
}
