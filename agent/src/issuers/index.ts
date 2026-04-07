import type { PlaygroundIssuerOptions } from '../issuer.js'
import { bdrCredentialsData, bdrIssuer } from './bdr.js'
import { kolnCredentialsData, kolnIssuer } from './koln.js'
import { krankenkasseCredentialsData, krankenkasseIssuer } from './krankenkasse.js'
import { mvrcCredentialsData, mvrcIssuer } from './mvrc.js'
import { openHorizonBankCredentialsData, openHorizonBankIssuer } from './openHorizonBank.js'
import { steuernCredentialsData, steuernIssuer } from './steuern.js'
import { telOrgCredentialsData, telOrgIssuer } from './telOrg.js'
import { utopiaGovernmentData, utopiaGovernmentIssuer } from './utopiaGovernment.js'

export const issuers: PlaygroundIssuerOptions[] = [
  bdrIssuer,
  kolnIssuer,
  steuernIssuer,
  krankenkasseIssuer,
  telOrgIssuer,
  mvrcIssuer,
  utopiaGovernmentIssuer,
  openHorizonBankIssuer,
]

export const issuersCredentialsData = {
  ...bdrCredentialsData,
  ...kolnCredentialsData,
  ...steuernCredentialsData,
  ...krankenkasseCredentialsData,
  ...telOrgCredentialsData,
  ...mvrcCredentialsData,
  ...utopiaGovernmentData,
  ...openHorizonBankCredentialsData,
}
