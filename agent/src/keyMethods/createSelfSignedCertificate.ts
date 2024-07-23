import { type Key, X509Service } from '@credo-ts/core'
import { agent } from '../agent'
import { AGENT_HOST } from '../constants'

export const createSelfSignedCertificate = async (key: Key) =>
  (
    await X509Service.createSelfSignedCertificate(agent.context, {
      key,
      extensions: [[{ type: 'url', value: AGENT_HOST }]],
      notBefore: new Date(0), // Thu Jan 01 1970 01:00:00 GMT+0100 (Central European Standard Time)
      notAfter: new Date(10000000000000), // Sat Nov 20 2286 18:46:40 GMT+0100 (Central European Standard Time)
    })
  ).toString('base64')
