import type { PlaygroundIssuerOptions } from '../issuer'
import { bdrCredentialsData, bdrIssuer } from './bdr'
import { kolnCredentialsData, kolnIssuer } from './koln'
import { krankenkasseCredentialsData, krankenkasseIssuer } from './krankenkasse'
import { mvrcCredentialsData, mvrcIssuer } from './mvrc'
import { nederlandenCredentialsData } from './nederlanden'
import { nederlandenIssuer } from './nederlanden'
import { steuernCredentialsData, steuernIssuer } from './steuern'
import { telOrgCredentialsData, telOrgIssuer } from './telOrg'
import { vwsCredentialsData } from './vws'
import { vwsIssuer } from './vws'

export const issuers: PlaygroundIssuerOptions[] = [
  bdrIssuer,
  kolnIssuer,
  steuernIssuer,
  krankenkasseIssuer,
  telOrgIssuer,
  nederlandenIssuer,
  mvrcIssuer,
  vwsIssuer,
]

export const issuersCredentialsData = {
  ...bdrCredentialsData,
  ...kolnCredentialsData,
  ...steuernCredentialsData,
  ...krankenkasseCredentialsData,
  ...telOrgCredentialsData,
  ...nederlandenCredentialsData,
  ...mvrcCredentialsData,
  ...vwsCredentialsData,
}
