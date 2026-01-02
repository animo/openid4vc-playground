import type { PlaygroundIssuerOptions } from '../issuer'
import { bdrCredentialsData, bdrIssuer } from './bdr'
import { kolnCredentialsData, kolnIssuer } from './koln'
import { krankenkasseCredentialsData, krankenkasseIssuer } from './krankenkasse'
import { mvrcCredentialsData, mvrcIssuer } from './mvrc'
import { steuernCredentialsData, steuernIssuer } from './steuern'
import { telOrgCredentialsData, telOrgIssuer } from './telOrg'
import { utopiaGovernmentData, utopiaGovernmentIssuer } from './utopiaGovernment'

export const issuers: PlaygroundIssuerOptions[] = [
  bdrIssuer,
  kolnIssuer,
  steuernIssuer,
  krankenkasseIssuer,
  telOrgIssuer,
  mvrcIssuer,
  utopiaGovernmentIssuer,
]

export const issuersCredentialsData = {
  ...bdrCredentialsData,
  ...kolnCredentialsData,
  ...steuernCredentialsData,
  ...krankenkasseCredentialsData,
  ...telOrgCredentialsData,
  ...mvrcCredentialsData,
  ...utopiaGovernmentData,
}
