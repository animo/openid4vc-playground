import { type Key, X509Service } from '@credo-ts/core'
import { agent } from '../agent'
import { AGENT_DNS } from '../constants'

export const createSelfSignedCertificate = async (key: Key) =>
  (
    await X509Service.createSelfSignedCertificate(agent.context, {
      key,
      extensions: [[{ type: 'dns', value: AGENT_DNS }]],
      notBefore: new Date(0), // Thu Jan 01 1970 01:00:00 GMT+0100 (Central European Standard Time)
      notAfter: new Date(1763799732333), // Sat Nov 22 2025 09:22:12 GMT+0100 (Central European Standard Time)
    })
  ).toString('base64')
