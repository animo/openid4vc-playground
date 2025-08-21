import { randomUUID } from 'crypto'
import { cborDecode, cborEncode } from '@animo-id/mdoc'
import {
  ClaimFormat,
  JsonTransformer,
  Kms,
  type MdocSignOptions,
  type SdJwtVcSignOptions,
  W3cCredential,
  parseDid,
} from '@credo-ts/core'
import {
  OpenId4VcVerifierApi,
  type OpenId4VciCreateIssuerOptions,
  type OpenId4VciCredentialConfigurationSupportedWithFormats,
  type OpenId4VciCredentialIssuerMetadataDisplay,
  type OpenId4VciCredentialRequestToCredentialMapper,
  type OpenId4VciDeferredCredentialRequestToCredentialMapper,
  type OpenId4VciDeferredCredentials,
  type OpenId4VciGetVerificationSessionForIssuanceSessionAuthorization,
  type OpenId4VciSignCredentials,
  type OpenId4VciSignMdocCredentials,
  type OpenId4VciSignSdJwtCredentials,
  type OpenId4VciSignW3cCredentials,
} from '@credo-ts/openid4vc'
import { agent } from './agent'
import { AGENT_HOST } from './constants'
import { getWebDidDocument } from './didWeb'
import { issuers, issuersCredentialsData } from './issuers'
import { arfCompliantPidSdJwtData, arfCompliantPidUrnVctSdJwtData, bdrIssuer } from './issuers/bdr'
import { kolnIssuer } from './issuers/koln'
import { krankenkasseIssuer } from './issuers/krankenkasse'
import { eudiPidSdJwtData, nederlandenIssuer } from './issuers/nederlanden'
import { steuernIssuer } from './issuers/steuern'
import { telOrgIssuer } from './issuers/telOrg'
import { getX509Certificates, getX509DcsCertificate } from './keyMethods'
import type { StaticLdpVcSignInput, StaticMdocSignInput, StaticSdJwtSignInput } from './types'
import { oneYearInMilliseconds, serverStartupTimeInMilliseconds, tenDaysInMilliseconds } from './utils/date'
import { getVerifier } from './verifier'
import { bundesregierungVerifier } from './verifiers/bundesregierung'
import { pidMdocCredential, pidSdJwtCredential, presentationDefinitionFromRequest } from './verifiers/util'

export type CredentialConfigurationDisplay = NonNullable<
  NonNullable<OpenId4VciCredentialConfigurationSupportedWithFormats['credential_metadata']>['display']
>[number]

type IssuerDisplay = OpenId4VciCredentialIssuerMetadataDisplay & {
  logo: NonNullable<OpenId4VciCredentialIssuerMetadataDisplay['logo']> & { uri: string }
}

export type MdocConfiguration = OpenId4VciCredentialConfigurationSupportedWithFormats & {
  format: 'mso_mdoc'
  display: [CredentialConfigurationDisplay, ...CredentialConfigurationDisplay[]]
}
export type LdpVcConfiguration = OpenId4VciCredentialConfigurationSupportedWithFormats & {
  format: 'ldp_vc'
  display: [CredentialConfigurationDisplay, ...CredentialConfigurationDisplay[]]
}

export type SdJwtConfiguration = OpenId4VciCredentialConfigurationSupportedWithFormats & {
  format: 'vc+sd-jwt'
  display: [CredentialConfigurationDisplay, ...CredentialConfigurationDisplay[]]
}

export interface PlaygroundIssuerOptions
  extends Omit<OpenId4VciCreateIssuerOptions, 'credentialConfigurationsSupported'> {
  tags: string[]
  issuerId: string
  display: [IssuerDisplay, ...IssuerDisplay[]]
  playgroundDisplayName?: string
  credentialConfigurationsSupported: Array<{
    mso_mdoc?: {
      configuration: MdocConfiguration
      data: StaticMdocSignInput
    }
    'vc+sd-jwt'?: {
      configuration: SdJwtConfiguration
      data: StaticSdJwtSignInput
    }
    ldp_vc?: {
      configuration: LdpVcConfiguration
      data: StaticLdpVcSignInput
    }
  }>
}

export type SerializableSdJwtVcSignOptions = Omit<OpenId4VciSignSdJwtCredentials, 'type' | 'credentials'> & {
  credentials: Array<
    Omit<SdJwtVcSignOptions, 'holder' | 'issuer'> & {
      holder:
        | {
            method: 'did'
            didUrl: string
          }
        | {
            method: 'jwk'
            jwk: Record<string, unknown>
          }
    }
  >
}

export type SerializableMdocSignOptions = Omit<OpenId4VciSignMdocCredentials, 'type' | 'credentials'> & {
  credentials: Array<
    Omit<MdocSignOptions, 'namespaces' | 'issuerCertificate' | 'holderKey' | 'validityInfo'> & {
      holderKey: Record<string, unknown>
      validityInfo: string
      namespaces: string
    }
  >
}

export type SerializableW3cSignOptions = Omit<OpenId4VciSignW3cCredentials, 'type' | 'credentials'> & {
  credentials: Array<{
    verificationMethod: string
    credential: Record<string, unknown>
  }>
}

export type SerializableSignCredentialOptions =
  | SerializableSdJwtVcSignOptions
  | SerializableMdocSignOptions
  | SerializableW3cSignOptions

export interface IssuanceMetadata extends Record<string, unknown> {
  deferUntil?: number
  signOptions?: SerializableSignCredentialOptions
}

export function serializableSignOptionsToSignOptions({
  format,
  credentials,
  ...rest
}: SerializableSignCredentialOptions): OpenId4VciSignCredentials {
  switch (format) {
    case ClaimFormat.SdJwtVc:
      return {
        type: 'credentials',
        format,
        ...rest,
        credentials: credentials.map((credential) => ({
          ...credential,
          holder:
            credential.holder.method === 'did'
              ? {
                  method: credential.holder.method,
                  didUrl: credential.holder.didUrl,
                }
              : {
                  method: credential.holder.method,
                  jwk: Kms.PublicJwk.fromUnknown(credential.holder.jwk),
                },
          issuer: {
            method: 'x5c',
            x5c: getX509Certificates(),
            issuer: AGENT_HOST,
          },
        })),
      } satisfies OpenId4VciSignSdJwtCredentials

    case ClaimFormat.MsoMdoc:
      return {
        type: 'credentials',
        format,
        ...rest,
        credentials: credentials.map((credential) => ({
          ...credential,
          validityInfo: cborDecode(Buffer.from(credential.validityInfo, 'base64url')),
          namespaces: cborDecode(Buffer.from(credential.namespaces, 'base64url')),
          holderKey: Kms.PublicJwk.fromUnknown(credential.holderKey),
          issuerCertificate: getX509DcsCertificate(),
        })),
      } satisfies OpenId4VciSignMdocCredentials

    case ClaimFormat.JwtVc:
    case ClaimFormat.LdpVc:
      return {
        type: 'credentials',
        format,
        ...rest,
        credentials: credentials.map((credential) => ({
          verificationMethod: credential.verificationMethod,
          credential: W3cCredential.fromJson(credential.credential),
        })),
      }

    default:
      throw new Error(`Unsupported claim format: ${format}`)
  }
}

export async function createOrUpdateIssuer(options: OpenId4VciCreateIssuerOptions & { issuerId: string }) {
  if (await doesIssuerExist(options.issuerId)) {
    await agent.modules.openId4VcIssuer.updateIssuerMetadata(options)
  } else {
    return agent.modules.openId4VcIssuer.createIssuer(options)
  }
}

export async function doesIssuerExist(issuerId: string) {
  try {
    await agent.modules.openId4VcIssuer.getIssuerByIssuerId(issuerId)
    return true
  } catch (error) {
    return false
  }
}

export async function getIssuer(issuerId: string) {
  return agent.modules.openId4VcIssuer.getIssuerByIssuerId(issuerId)
}

export function getIssuerIdForCredentialConfigurationId(credentialConfigurationId: string) {
  const issuer = issuers.find(({ credentialConfigurationsSupported }) =>
    Object.values(credentialConfigurationsSupported)
      .flatMap((a) =>
        Object.values(a).flatMap((b) => [
          b.data.credentialConfigurationId,
          `${b.data.credentialConfigurationId}-dc-sd-jwt`,
          `${b.data.credentialConfigurationId}-key-attestations`,
          `${b.data.credentialConfigurationId}-dc-sd-jwt-key-attestations`,
        ])
      )
      .includes(credentialConfigurationId)
  )

  if (!issuer) {
    throw new Error(`Issuer not found for credential configuration id ${credentialConfigurationId}`)
  }

  return issuer.issuerId
}

export const getVerificationSessionForIssuanceSession: OpenId4VciGetVerificationSessionForIssuanceSessionAuthorization =
  async ({ agentContext, scopes, requestedCredentialConfigurations }) => {
    const verifier = await getVerifier(bundesregierungVerifier.verifierId)
    const certificates = getX509Certificates()
    const verifierApi = agentContext.dependencyManager.resolve(OpenId4VcVerifierApi)

    const [credentialConfigurationId, credentialConfiguration] = Object.entries(requestedCredentialConfigurations)[0]

    if (credentialConfiguration.format !== 'mso_mdoc' && credentialConfiguration.format !== 'vc+sd-jwt') {
      throw new Error('Presentation during issuance is only supported for mso_mdoc and vc+sd-jwt')
    }

    const credentialName = credentialConfiguration.credential_metadata?.display?.[0]?.name ?? 'card'

    const authorizationRequest = await verifierApi.createAuthorizationRequest({
      verifierId: verifier.verifierId,
      requestSigner: {
        method: 'x5c',
        x5c: certificates,
      },
      presentationExchange:
        credentialConfigurationId === arfCompliantPidSdJwtData.credentialConfigurationId ||
        credentialConfigurationId === `${arfCompliantPidSdJwtData.credentialConfigurationId}-dc-sd-jwt` ||
        credentialConfigurationId ===
          `${arfCompliantPidSdJwtData.credentialConfigurationId}-dc-sd-jwt-key-attestations` ||
        credentialConfigurationId === `${arfCompliantPidSdJwtData.credentialConfigurationId}-key-attestations` ||
        credentialConfigurationId === arfCompliantPidUrnVctSdJwtData.credentialConfigurationId ||
        credentialConfigurationId === `${arfCompliantPidUrnVctSdJwtData.credentialConfigurationId}-dc-sd-jwt` ||
        credentialConfigurationId ===
          `${arfCompliantPidUrnVctSdJwtData.credentialConfigurationId}-dc-sd-jwt-key-attestations` ||
        credentialConfigurationId === `${arfCompliantPidUrnVctSdJwtData.credentialConfigurationId}-key-attestations` ||
        credentialConfigurationId === eudiPidSdJwtData.credentialConfigurationId ||
        credentialConfigurationId === `${eudiPidSdJwtData.credentialConfigurationId}-dc-sd-jwt` ||
        credentialConfigurationId === `${eudiPidSdJwtData.credentialConfigurationId}-dc-sd-jwt-key-attestaions` ||
        credentialConfigurationId === `${eudiPidSdJwtData.credentialConfigurationId}-key-attestations`
          ? {
              definition: presentationDefinitionFromRequest({
                name: 'Identity card',
                purpose: 'To issue your ARF compliant PID we need to verify your german PID',
                credentials: [
                  pidSdJwtCredential({
                    fields: [
                      'issuing_country',
                      'issuing_authority',
                      'family_name',
                      'birthdate',
                      'age_birth_year',
                      'age_in_years',
                      'given_name',
                      'birth_family_name',
                      'place_of_birth.locality',
                      'address.country',
                      'address.postal_code',
                      'address.locality',
                      'address.street_address',
                      'age_equal_or_over.12',
                      'age_equal_or_over.14',
                      'age_equal_or_over.16',
                      'age_equal_or_over.18',
                      'age_equal_or_over.21',
                      'age_equal_or_over.65',
                      'nationalities',
                    ],
                  }),
                ],
              }),
            }
          : {
              definition: presentationDefinitionFromRequest({
                name: 'Identity card',
                purpose: `To issue your ${credentialName} we need to verify your identity card`,
                credentials: [
                  pidSdJwtCredential({
                    fields: [
                      'given_name',
                      'family_name',
                      'birthdate',
                      'issuing_authority',
                      'issuing_country',
                      'address',
                      'place_of_birth',
                      'nationalities',
                    ],
                  }),
                  pidMdocCredential({
                    fields: [
                      'given_name',
                      'family_name',
                      'birth_date',
                      'issuing_country',
                      'issuing_authority',
                      'resident_street',
                      'resident_postal_code',
                      'resident_city',
                      'birth_place',
                      'nationality',
                    ],
                  }),
                ],
                credential_sets: [[0, 1]],
              }),
            },
      responseMode: 'direct_post.jwt',
    })

    return {
      ...authorizationRequest,
      scopes,
    }
  }

export const credentialRequestToCredentialMapper: OpenId4VciCredentialRequestToCredentialMapper = async ({
  holderBinding,
  credentialConfigurationId,
  verification,
  issuanceSession,
}): Promise<OpenId4VciSignCredentials | OpenId4VciDeferredCredentials> => {
  const normalizedCredentialConfigurationId = credentialConfigurationId
    .replace('-dc-sd-jwt', '')
    .replace('-key-attestations', '')
  const credentialData = issuersCredentialsData[normalizedCredentialConfigurationId]
  if (!credentialData) {
    throw new Error(`Unsupported credential configuration id ${credentialConfigurationId}`)
  }

  let signOptions: SerializableSignCredentialOptions | undefined

  if (issuanceSession.presentation?.required) {
    const descriptor = verification?.presentationExchange?.descriptors[0]

    // We allow receiving the PID in both SD-JWT and mdoc when issuing in sd-jwt or mdoc format
    if (descriptor?.claimFormat === ClaimFormat.SdJwtVc || descriptor?.claimFormat === ClaimFormat.MsoMdoc) {
      const driversLicenseClaims =
        descriptor.claimFormat === ClaimFormat.SdJwtVc
          ? {
              given_name: descriptor.credential.prettyClaims.given_name,
              family_name: descriptor.credential.prettyClaims.family_name,
              birth_date: descriptor.credential.prettyClaims.birthdate,

              issuing_authority: descriptor.credential.prettyClaims.issuing_authority,

              // NOTE: MUST be same as the C= value in the issuer cert for mdoc (checked by libs)
              // We can request PID SD-JWT and issue mDOC drivers license, so to make it easier we
              // always set it
              issuing_country: 'NL',
              // issuing_country: descriptor.credential.prettyClaims.issuing_country,
            }
          : {
              given_name: descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].given_name,
              family_name: descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].family_name,
              birth_date: descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].birth_date,

              issuing_authority:
                descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].issuing_authority,

              // NOTE: MUST be same as the C= value in the issuer cert for mdoc (checked by libs)
              issuing_country: 'NL',
              // issuing_country: descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].issuing_country,
            }

      const taxIdClaims =
        descriptor.claimFormat === ClaimFormat.SdJwtVc
          ? {
              registered_given_name: descriptor.credential.prettyClaims.given_name,
              registered_family_name: descriptor.credential.prettyClaims.family_name,
              resident_address: `${(descriptor.credential.prettyClaims.address as Record<string, string>).street_address}, ${(descriptor.credential.prettyClaims.address as Record<string, string>).postal_code} ${(descriptor.credential.prettyClaims.address as Record<string, string>).locality}`,
              birth_date: descriptor.credential.prettyClaims.birthdate,

              issuing_authority: descriptor.credential.prettyClaims.issuing_authority,
              issuing_country: descriptor.credential.prettyClaims.issuing_country,
            }
          : {
              registered_given_name: descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].given_name,
              registered_family_name:
                descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].family_name,
              resident_address: `${descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].resident_street}, ${descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].resident_postal_code} ${descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].resident_city}`,
              birth_date: descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].birth_date,
              issuing_authority:
                descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].issuing_authority,
              issuing_country: descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].issuing_country,
            }

      const certificateOfResidenceClaims =
        descriptor.claimFormat === ClaimFormat.SdJwtVc
          ? {
              family_name: descriptor.credential.prettyClaims.family_name,
              given_name: descriptor.credential.prettyClaims.given_name,
              resident_address: `${(descriptor.credential.prettyClaims.address as Record<string, string>).street_address}, ${(descriptor.credential.prettyClaims.address as Record<string, string>).postal_code} ${(descriptor.credential.prettyClaims.address as Record<string, string>).locality}`,
              birth_date: descriptor.credential.prettyClaims.birthdate,
              birth_place: (descriptor.credential.prettyClaims.place_of_birth as Record<string, string>).locality,
              nationality: (descriptor.credential.prettyClaims.nationalities as string[])[0],
              issuing_country: descriptor.credential.prettyClaims.issuing_country,
            }
          : {
              given_name: descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].given_name,
              family_name: descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].family_name,
              resident_address: `${descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].resident_street}, ${descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].resident_postal_code} ${descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].resident_city}`,
              birth_date: descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].birth_date,
              birth_place: descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].birth_place,
              nationality: descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].nationality,
              issuing_country: descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].issuing_country,
            }

      const healthIdClaims = descriptor.claimFormat === ClaimFormat.SdJwtVc ? {} : {}

      const msisdnClaimsData =
        descriptor.claimFormat === ClaimFormat.SdJwtVc
          ? {
              registered_given_name: descriptor.credential.prettyClaims.given_name,
              registered_family_name: descriptor.credential.prettyClaims.family_name,
            }
          : {
              registered_given_name: descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].given_name,
              registered_family_name:
                descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].family_name,
            }

      const arfCompliantPidData =
        descriptor.claimFormat === ClaimFormat.SdJwtVc
          ? {
              family_name: descriptor.credential.prettyClaims.family_name,
              given_name: descriptor.credential.prettyClaims.given_name,
              birth_date: descriptor.credential.prettyClaims.birthdate,
              age_over_18: (descriptor.credential.prettyClaims.age_equal_or_over as Record<string, boolean>)['18'],

              // Mandatory metadata
              issuance_date: new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds),
              expiry_date: new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds),
              issuing_country: descriptor.credential.prettyClaims.issuing_country,
              issuing_authority: descriptor.credential.prettyClaims.issuing_authority,

              // Optional:
              age_over_12: (descriptor.credential.prettyClaims.age_equal_or_over as Record<string, boolean>)['12'],
              age_over_14: (descriptor.credential.prettyClaims.age_equal_or_over as Record<string, boolean>)['14'],
              age_over_16: (descriptor.credential.prettyClaims.age_equal_or_over as Record<string, boolean>)['16'],
              age_over_21: (descriptor.credential.prettyClaims.age_equal_or_over as Record<string, boolean>)['21'],
              age_over_65: (descriptor.credential.prettyClaims.age_equal_or_over as Record<string, boolean>)['65'],
              age_in_years: descriptor.credential.prettyClaims.age_in_years,
              age_birth_year: descriptor.credential.prettyClaims.age_birth_year,
              family_name_birth: descriptor.credential.prettyClaims.birth_family_name,

              birth_place: (descriptor.credential.prettyClaims.place_of_birth as Record<string, string>).locality,

              resident_country: (descriptor.credential.prettyClaims.address as Record<string, string>).country,
              resident_city: (descriptor.credential.prettyClaims.address as Record<string, string>).locality,
              resident_postal_code: (descriptor.credential.prettyClaims.address as Record<string, string>).postal_code,
              resident_street: (descriptor.credential.prettyClaims.address as Record<string, string>).street_address,
              nationality: (descriptor.credential.prettyClaims.nationalities as string[])[0],
            }
          : {}

      const nederlandenPidData =
        descriptor.claimFormat === ClaimFormat.SdJwtVc
          ? {
              family_name: descriptor.credential.prettyClaims.family_name,
              given_name: descriptor.credential.prettyClaims.given_name,
              birth_date: descriptor.credential.prettyClaims.birthdate,
              age_over_18: (descriptor.credential.prettyClaims.age_equal_or_over as Record<string, boolean>)['18'],

              // Mandatory metadata
              issuance_date: new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds),
              expiry_date: new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds),
              issuing_country: descriptor.credential.prettyClaims.issuing_country,
              issuing_authority: descriptor.credential.prettyClaims.issuing_authority,

              sex: descriptor.credential.prettyClaims.sex,

              // Optional:
              age_over_12: (descriptor.credential.prettyClaims.age_equal_or_over as Record<string, boolean>)['12'],
              age_over_14: (descriptor.credential.prettyClaims.age_equal_or_over as Record<string, boolean>)['14'],
              age_over_16: (descriptor.credential.prettyClaims.age_equal_or_over as Record<string, boolean>)['16'],
              age_over_21: (descriptor.credential.prettyClaims.age_equal_or_over as Record<string, boolean>)['21'],
              age_over_65: (descriptor.credential.prettyClaims.age_equal_or_over as Record<string, boolean>)['65'],
              age_in_years: descriptor.credential.prettyClaims.age_in_years,
              age_birth_year: descriptor.credential.prettyClaims.age_birth_year,
              family_name_birth: descriptor.credential.prettyClaims.birth_family_name,

              birth_place: (descriptor.credential.prettyClaims.place_of_birth as Record<string, string>).locality,

              resident_country: (descriptor.credential.prettyClaims.address as Record<string, string>).country,
              resident_city: (descriptor.credential.prettyClaims.address as Record<string, string>).locality,
              resident_postal_code: (descriptor.credential.prettyClaims.address as Record<string, string>).postal_code,
              resident_street: (descriptor.credential.prettyClaims.address as Record<string, string>).street_address,
              nationality: (descriptor.credential.prettyClaims.nationalities as string[])[0],
            }
          : {}

      const formatSpecificClaims = Object.fromEntries(
        Object.entries({
          [bdrIssuer.credentialConfigurationsSupported[0]['vc+sd-jwt'].data.credentialConfigurationId]:
            driversLicenseClaims,
          [bdrIssuer.credentialConfigurationsSupported[0].mso_mdoc.data.credentialConfigurationId]:
            driversLicenseClaims,

          [bdrIssuer.credentialConfigurationsSupported[1]['vc+sd-jwt'].data.credentialConfigurationId]:
            arfCompliantPidData,

          [bdrIssuer.credentialConfigurationsSupported[2]['vc+sd-jwt'].data.credentialConfigurationId]:
            arfCompliantPidData,

          [nederlandenIssuer.credentialConfigurationsSupported[0].mso_mdoc.data.credentialConfigurationId]:
            nederlandenPidData,
          // @ts-expect-error Can be undefined because other configuration does not have vc+sd-jwt
          [nederlandenIssuer.credentialConfigurationsSupported[0]['vc+sd-jwt'].data.credentialConfigurationId]:
            nederlandenPidData,

          [krankenkasseIssuer.credentialConfigurationsSupported[0]['vc+sd-jwt'].data.credentialConfigurationId]:
            healthIdClaims,
          [krankenkasseIssuer.credentialConfigurationsSupported[0].mso_mdoc.data.credentialConfigurationId]:
            healthIdClaims,

          [steuernIssuer.credentialConfigurationsSupported[0]['vc+sd-jwt'].data.credentialConfigurationId]: taxIdClaims,
          [steuernIssuer.credentialConfigurationsSupported[0].mso_mdoc.data.credentialConfigurationId]: taxIdClaims,

          [kolnIssuer.credentialConfigurationsSupported[0]['vc+sd-jwt'].data.credentialConfigurationId]:
            certificateOfResidenceClaims,
          [kolnIssuer.credentialConfigurationsSupported[0].mso_mdoc.data.credentialConfigurationId]:
            certificateOfResidenceClaims,

          [telOrgIssuer.credentialConfigurationsSupported[0]['vc+sd-jwt'].data.credentialConfigurationId]:
            msisdnClaimsData,
          [telOrgIssuer.credentialConfigurationsSupported[0].mso_mdoc.data.credentialConfigurationId]: msisdnClaimsData,
        }).flatMap(([configurationId, data]) => [
          [configurationId, data],
          [`${configurationId}-key-attestations`, data],
          [`${configurationId}-dc-sd-jwt`, data],
          [`${configurationId}-dc-sd-jwt-key-attestations`, data],
        ])
      )

      if (credentialData.format === ClaimFormat.SdJwtVc) {
        const { credential, ...restCredentialData } = credentialData

        signOptions = {
          ...restCredentialData,
          credentials: holderBinding.keys.map((holderBinding) => ({
            ...credential,
            payload: {
              ...credential.payload,
              ...formatSpecificClaims[credentialConfigurationId],
            },
            holder:
              holderBinding.method === 'did'
                ? holderBinding
                : {
                    method: 'jwk',
                    jwk: holderBinding.jwk.toJson(),
            },
          })),
        } satisfies SerializableSdJwtVcSignOptions
      } else if (credentialData.format === ClaimFormat.MsoMdoc) {
        const { credential, ...restCredentialData } = credentialData

        const [namespace, values] = Object.entries(credential.namespaces)[0]

        signOptions = {
          ...restCredentialData,
          credentials: holderBinding.keys.map((holderBinding) => ({
            ...credential,
            validityInfo: Buffer.from(cborEncode(credential.validityInfo)).toString('base64url'),
            namespaces: Buffer.from(
              cborEncode({
              [namespace]: {
                ...values,
                ...formatSpecificClaims[credentialConfigurationId],
              },
              })
            ).toString('base64url'),

            holderKey: holderBinding.jwk.toJson(),
          })),
        } satisfies SerializableMdocSignOptions
      }
    }
  }

  if (!signOptions) {
    if (credentialData.format === ClaimFormat.SdJwtVc) {
      const { credential, ...restCredentialData } = credentialData

      signOptions = {
        ...restCredentialData,
        credentials: holderBinding.keys.map((holderBinding) => ({
          ...credential,
          holder:
            holderBinding.method === 'did'
              ? holderBinding
              : {
                  method: 'jwk',
                  jwk: holderBinding.jwk.toJson(),
          },
        })),
      } satisfies SerializableSdJwtVcSignOptions
    } else if (credentialData.format === ClaimFormat.MsoMdoc) {
      const { credential, ...restCredentialData } = credentialData

      signOptions = {
        ...restCredentialData,
        credentials: holderBinding.keys.map((holderBinding) => ({
          ...credential,
          validityInfo: Buffer.from(cborEncode(credential.validityInfo)).toString('base64url'),
          namespaces: Buffer.from(cborEncode(credential.namespaces)).toString('base64url'),
          holderKey: holderBinding.jwk.toJson(),
        })),
      } satisfies SerializableMdocSignOptions
    } else if (credentialData.format === ClaimFormat.LdpVc) {
      const { credential, ...restCredentialData } = credentialData

      const didWeb = await getWebDidDocument()

      signOptions = {
        ...restCredentialData,
        credentials: holderBinding.keys.map((holderBinding) => {
          if (holderBinding.method !== 'did') {
            throw new Error("Only 'did' holder binding supported for ldp vc")
          }

          const json = JsonTransformer.toJSON(credential.credential)
          json.credentialSubject.id = parseDid(holderBinding.didUrl).did
          json.issuer.id = didWeb.id

          return {
            verificationMethod: `${didWeb.id}#key-1`,
            credential: json,
          }
        }),
      } satisfies SerializableW3cSignOptions
    } else {
      throw new Error(`Unsupported credential ${credentialConfigurationId}`)
    }
  }

  const issuanceMetadata: IssuanceMetadata = issuanceSession.issuanceMetadata ?? {}
  if (issuanceMetadata.deferUntil) {
    issuanceMetadata.signOptions = signOptions

    // NOTE: This is a bit hacky. We rely on the fact that we know that Credo
    // updates the stored issuance session after returning a deferral.
    issuanceSession.issuanceMetadata = issuanceMetadata

    return {
      type: 'deferral',
      transactionId: randomUUID() as string,
      interval: 15 * 60, // 15 minutes
    }
  }

  return serializableSignOptionsToSignOptions(signOptions)
}

export const deferredCredentialRequestToCredentialMapper: OpenId4VciDeferredCredentialRequestToCredentialMapper = ({
  deferredCredentialRequest,
  issuanceSession,
}) => {
  if (!issuanceSession.issuanceMetadata) {
    throw new Error('Issuance session does not have associated issuance metadata')
  }

  const issuanceMetadata: IssuanceMetadata = issuanceSession.issuanceMetadata

  if (!issuanceMetadata.deferUntil) {
    throw new Error('Issuance session metadata does not have deferUntil set')
  }

  if (!issuanceMetadata.signOptions) {
    throw new Error('Issuance session metadata does not have signOptions set')
  }

  // If no longer deferred, return the credentials
  if (issuanceMetadata.deferUntil < Date.now()) {
    return serializableSignOptionsToSignOptions(issuanceMetadata.signOptions)
  }

  // Otherwise, keep deferring
  return {
    type: 'deferral',
    transactionId: deferredCredentialRequest.transaction_id,
    interval: 2000,
  }
}
