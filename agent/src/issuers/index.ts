import { infrastrukturCredentialsData, infrastrukturIssuer } from './infrastruktur'
import { kolnCredentialsData, kolnIssuer } from './koln'
import { steuernCredentialsData, steuernIssuer } from './steuern'
import { technikerCredentialsData, technikerIssuer } from './techniker'

export const issuers = [infrastrukturIssuer, kolnIssuer, steuernIssuer, technikerIssuer]

export const issuersCredentialsData = {
  ...infrastrukturCredentialsData,
  ...kolnCredentialsData,
  ...steuernCredentialsData,
  ...technikerCredentialsData,
}
