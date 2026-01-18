import { AGENT_HOST } from '../constants.js'

export function getVctUrl(issuerId: string, configurationId: string) {
  return `${AGENT_HOST}/api/vct/${issuerId}/${encodeURI(configurationId)}`
}
