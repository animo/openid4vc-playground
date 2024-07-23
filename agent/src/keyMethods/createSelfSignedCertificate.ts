import { type Key, X509Service } from '@credo-ts/core'
import { agent } from '../agent'
import { AGENT_HOST } from '../constants'

export const createSelfSignedCertificate = async (key: Key) =>
  (
    await X509Service.createSelfSignedCertificate(agent.context, {
      key,
      extensions: [[{ type: 'url', value: AGENT_HOST }]],
    })
  ).toString('base64')
