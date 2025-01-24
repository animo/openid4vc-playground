import type { PlaygroundIssuerOptions } from '../issuer'
import { bdrCredentialsData, bdrIssuer } from './bdr'
import { kolnCredentialsData, kolnIssuer } from './koln'
import { krankenkasseCredentialsData, krankenkasseIssuer } from './krankenkasse'
import { steuernCredentialsData, steuernIssuer } from './steuern'
import { telOrgCredentialsData, telOrgIssuer } from './telOrg'

export const issuers: PlaygroundIssuerOptions[] = [
  bdrIssuer,
  kolnIssuer,
  steuernIssuer,
  krankenkasseIssuer,
  telOrgIssuer,
]

export const issuersCredentialsData = {
  ...bdrCredentialsData,
  ...kolnCredentialsData,
  ...steuernCredentialsData,
  ...krankenkasseCredentialsData,
  ...telOrgCredentialsData,
}
