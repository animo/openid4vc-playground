import cors from 'cors'
import { createHash } from 'crypto'
import express from 'express'
import { popPendingCredentialResponseMetadata } from './utils/credentialResponseMetadata.js'

export const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())
app.use(express.urlencoded())

// Intercept credential endpoint responses to inject credential_metadata.
// The credential mapper sets pending metadata keyed by sha256(access_token).
// This middleware must be registered before agent.initialize() mounts the OID4VCI routes.
app.use('/oid4vci', (req, res, next) => {
  if (!req.path.endsWith('/credential')) return next()

  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined

  if (!token) return next()

  const originalSend = res.send.bind(res)
  res.send = (body: unknown) => {
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body) as Record<string, unknown>
        const hash = createHash('sha256').update(token).digest('hex')
        const credentialMetadata = popPendingCredentialResponseMetadata(hash)
        if (credentialMetadata) {
          body = JSON.stringify({ ...parsed, credential_metadata: credentialMetadata })
        }
      } catch {
        // not JSON, leave body unchanged
      }
    }
    return originalSend(body)
  }

  next()
})
