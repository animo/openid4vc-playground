import cors from 'cors'
import express from 'express'
import { credentialResponseMetadata } from './utils/credentialResponseMetadata.js'

export const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())
app.use(express.urlencoded())

// Intercept credential endpoint responses to inject credential_metadata set by
// the credential mapper. Must be registered before agent.initialize() mounts
// the OID4VCI routes.
app.use('/oid4vci', (req, res, next) => {
  if (!req.path.endsWith('/credential')) return next()

  credentialResponseMetadata.run(() => {
    const originalSend = res.send.bind(res)
    res.send = (body: unknown) => {
      const metadata = credentialResponseMetadata.get()
      if (typeof body === 'string' && metadata) {
        try {
          const parsed = JSON.parse(body) as Record<string, unknown>
          const existing =
            typeof parsed.credential_metadata === 'object' && parsed.credential_metadata !== null
              ? (parsed.credential_metadata as Record<string, unknown>)
              : {}
          body = JSON.stringify({ ...parsed, credential_metadata: { ...existing, ...metadata } })
        } catch {
          // not JSON, leave body unchanged
        }
      }
      return originalSend(body)
    }
    next()
  })
})
