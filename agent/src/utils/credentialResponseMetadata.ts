import { AsyncLocalStorage } from 'node:async_hooks'

type Store = { metadata?: Record<string, unknown> }

const storage = new AsyncLocalStorage<Store>()

export const credentialResponseMetadata = {
  run: (fn: () => void) => storage.run({}, fn),
  set: (metadata: Record<string, unknown>) => {
    const store = storage.getStore()
    if (store) store.metadata = metadata
  },
  get: () => storage.getStore()?.metadata,
}
