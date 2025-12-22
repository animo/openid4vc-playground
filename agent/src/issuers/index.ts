import type { PlaygroundIssuerOptions } from '../issuer'
import { bdrCredentialsData, bdrIssuer } from './bdr'
import { kolnCredentialsData, kolnIssuer } from './koln'
import { krankenkasseCredentialsData, krankenkasseIssuer } from './krankenkasse'
import { mvrcCredentialsData, mvrcIssuer } from './mvrc'
import { nederlandenCredentialsData, nederlandenIssuer } from './nederlanden'
import { steuernCredentialsData, steuernIssuer } from './steuern'
import { telOrgCredentialsData, telOrgIssuer } from './telOrg'
import { utopiaGovernmentData, utopiaGovernmentIssuer } from './utopiaGovernment'
import { vwsCredentialsData, vwsIssuer } from './vws'

export const issuers: PlaygroundIssuerOptions[] = [
  bdrIssuer,
  kolnIssuer,
  steuernIssuer,
  krankenkasseIssuer,
  telOrgIssuer,
  nederlandenIssuer,
  mvrcIssuer,
  vwsIssuer,
  utopiaGovernmentIssuer,
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
  ...utopiaGovernmentData,
}
