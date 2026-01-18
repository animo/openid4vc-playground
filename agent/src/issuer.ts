import { cborDecode, cborEncode } from '@animo-id/mdoc'
import {
  ClaimFormat,
  Kms,
  type MdocSignOptions,
  type NonEmptyArray,
  type SdJwtVcSignOptions,
  type SdJwtVcTypeMetadata,
} from '@credo-ts/core'
import {
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
  OpenId4VcVerifierApi,
} from '@credo-ts/openid4vc'
import { randomUUID } from 'crypto'
import { agent } from './agent.js'
import { bdrIssuer } from './issuers/bdr.js'
import { issuers, issuersCredentialsData } from './issuers/index.js'
import { kolnIssuer } from './issuers/koln.js'
import { krankenkasseIssuer } from './issuers/krankenkasse.js'
import { steuernIssuer } from './issuers/steuern.js'
import { telOrgIssuer } from './issuers/telOrg.js'
import { getX509DcsCertificate } from './keyMethods/index.js'
import type { StaticMdocSignInput, StaticSdJwtSignInput } from './types.js'
import { oneYearInMilliseconds, serverStartupTimeInMilliseconds, tenDaysInMilliseconds } from './utils/date.js'
import { getVerifier } from './verifier.js'
import { dcqlQueryFromRequest, pidMdocCredential, pidSdJwtCredential } from './verifiers/util.js'
import { utopiaGovernmentVerifier } from './verifiers/utopiaGovernment.js'

export type CredentialConfigurationDisplay = NonNullable<
  NonNullable<OpenId4VciCredentialConfigurationSupportedWithFormats['credential_metadata']>['display']
>[number]

export type CredentialConfigurationClaims = NonEmptyArray<
  NonNullable<
    NonNullable<
      OpenId4VciCredentialConfigurationSupportedWithFormats['credential_metadata'] & { format: 'mso_mdoc' }
    >['claims']
  >[number]
>

type IssuerDisplay = OpenId4VciCredentialIssuerMetadataDisplay & {
  logo: NonNullable<OpenId4VciCredentialIssuerMetadataDisplay['logo']> & { uri: string }
}

export type MdocConfiguration = OpenId4VciCredentialConfigurationSupportedWithFormats & {
  format: 'mso_mdoc'
  display: [CredentialConfigurationDisplay, ...CredentialConfigurationDisplay[]]
  credential_metadata: (OpenId4VciCredentialConfigurationSupportedWithFormats & {
    format: 'mso_mdoc'
  })['credential_metadata'] & {
    display: [CredentialConfigurationDisplay, ...CredentialConfigurationDisplay[]]
  }
}

export type SdJwtConfiguration = OpenId4VciCredentialConfigurationSupportedWithFormats & {
  format: 'dc+sd-jwt'
  display: [CredentialConfigurationDisplay, ...CredentialConfigurationDisplay[]]
  credential_metadata: (OpenId4VciCredentialConfigurationSupportedWithFormats & {
    format: 'dc+sd-jwt'
  })['credential_metadata'] & {
    display: [CredentialConfigurationDisplay, ...CredentialConfigurationDisplay[]]
  }
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
    'dc+sd-jwt'?: {
      configuration: SdJwtConfiguration
      data: StaticSdJwtSignInput

      /**
       * Optional VCT Type Metadata to host
       */
      typeMetadata?: SdJwtVcTypeMetadata
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

export type SerializableSignCredentialOptions = SerializableSdJwtVcSignOptions | SerializableMdocSignOptions

export interface IssuanceMetadata extends Record<string, unknown> {
  deferInterval?: number
  signOptions?: SerializableSignCredentialOptions
}

export function serializableSignOptionsToSignOptions({
  format,
  credentials,
  ...rest
}: SerializableSignCredentialOptions): OpenId4VciSignCredentials {
  switch (format) {
    case ClaimFormat.SdJwtDc:
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
            x5c: [getX509DcsCertificate()],
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
          validityInfo: cborDecode(Buffer.from(credential.validityInfo, 'base64url'), { mapsAsObjects: true }),
          namespaces: cborDecode(Buffer.from(credential.namespaces, 'base64url'), { mapsAsObjects: true }),
          holderKey: Kms.PublicJwk.fromUnknown(credential.holderKey),
          issuerCertificate: getX509DcsCertificate(),
        })),
      } satisfies OpenId4VciSignMdocCredentials

    default:
      throw new Error(`Unsupported claim format: ${format}`)
  }
}

export async function createOrUpdateIssuer(options: OpenId4VciCreateIssuerOptions & { issuerId: string }) {
  if (await doesIssuerExist(options.issuerId)) {
    await agent.openid4vc.issuer.updateIssuerMetadata(options)
  } else {
    return agent.openid4vc.issuer.createIssuer(options)
  }
}

export async function doesIssuerExist(issuerId: string) {
  try {
    await agent.openid4vc.issuer.getIssuerByIssuerId(issuerId)
    return true
  } catch (_error) {
    return false
  }
}

export async function getIssuer(issuerId: string) {
  return agent.openid4vc.issuer.getIssuerByIssuerId(issuerId)
}

export function getIssuerIdForCredentialConfigurationId(credentialConfigurationId: string) {
  const issuer = issuers.find(({ credentialConfigurationsSupported }) =>
    Object.values(credentialConfigurationsSupported)
      .flatMap((a) =>
        Object.values(a).flatMap((b) => [
          b.data.credentialConfigurationId,
          `${b.data.credentialConfigurationId}-key-attestations`,
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
    const verifier = await getVerifier(utopiaGovernmentVerifier.verifierId)
    const verifierApi = agentContext.dependencyManager.resolve(OpenId4VcVerifierApi)

    const [, credentialConfiguration] = Object.entries(requestedCredentialConfigurations)[0]

    if (credentialConfiguration.format !== 'mso_mdoc' && credentialConfiguration.format !== 'dc+sd-jwt') {
      throw new Error('Presentation during issuance is only supported for mso_mdoc and dc+sd-jwt')
    }

    const credentialName = credentialConfiguration.credential_metadata?.display?.[0]?.name ?? 'card'
    const authorizationRequest = await verifierApi.createAuthorizationRequest({
      verifierId: verifier.verifierId,
      requestSigner: {
        method: 'x5c',
        x5c: [getX509DcsCertificate()],
      },
      version: 'v1',
      dcql: {
        // User needs to present either german PID in SD-JWT, or EUDI PID in SD-JWT/mDOC
        query: dcqlQueryFromRequest({
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
                'place_of_birth',
                'nationality',
              ],
            }),
            pidSdJwtCredential({
              fields: [
                'given_name',
                'family_name',
                'birthdate',
                'place_of_birth',
                'address',
                'nationalities',

                // Mandatory metadata
                'date_of_expiry',
                'issuing_country',
                'issuing_authority',
              ],
            }),
          ],
          credential_sets: [[0, 1, 2]],
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
  const normalizedCredentialConfigurationId = credentialConfigurationId.replace('-key-attestations', '')
  const credentialData = issuersCredentialsData[normalizedCredentialConfigurationId]
  if (!credentialData) {
    throw new Error(`Unsupported credential configuration id ${credentialConfigurationId}`)
  }

  let signOptions: SerializableSignCredentialOptions | undefined

  if (issuanceSession.presentation?.required) {
    const presentation = verification?.dcql?.presentations
      ? Object.values(verification?.dcql?.presentations)[0]?.[0]
      : undefined

    // We allow receiving the PID in both SD-JWT and mdoc when issuing in sd-jwt or mdoc format
    if (presentation?.claimFormat === ClaimFormat.SdJwtDc || presentation?.claimFormat === ClaimFormat.MsoMdoc) {
      const driversLicenseClaims =
        presentation.claimFormat === ClaimFormat.SdJwtDc
          ? {
              given_name: presentation.prettyClaims.given_name,
              family_name: presentation.prettyClaims.family_name,
              birth_date: presentation.prettyClaims.birthdate,

              issuing_authority: presentation.prettyClaims.issuing_authority,

              // NOTE: MUST be same as the C= value in the issuer cert for mdoc (checked by libs)
              // We can request PID SD-JWT and issue mDOC drivers license, so to make it easier we
              // always set it
              issuing_country: 'NL',
              // issuing_country: presentation.prettyClaims.issuing_country,
            }
          : {
              given_name: presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].given_name,
              family_name: presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].family_name,
              birth_date: presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].birth_date,

              issuing_authority:
                presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].issuing_authority,

              // NOTE: MUST be same as the C= value in the issuer cert for mdoc (checked by libs)
              issuing_country: 'NL',
              // issuing_country: presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].issuing_country,
            }

      const taxIdClaims =
        presentation.claimFormat === ClaimFormat.SdJwtDc
          ? {
              registered_given_name: presentation.prettyClaims.given_name,
              registered_family_name: presentation.prettyClaims.family_name,
              resident_address: `${(presentation.prettyClaims.address as Record<string, string>).street_address}, ${(presentation.prettyClaims.address as Record<string, string>).postal_code} ${(presentation.prettyClaims.address as Record<string, string>).locality}`,
              birth_date: presentation.prettyClaims.birthdate,

              issuing_authority: presentation.prettyClaims.issuing_authority,
              issuing_country: presentation.prettyClaims.issuing_country,
            }
          : {
              registered_given_name:
                presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].given_name,
              registered_family_name:
                presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].family_name,
              resident_address: `${presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].resident_street}, ${presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].resident_postal_code} ${presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].resident_city}`,
              birth_date: presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].birth_date,
              issuing_authority:
                presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].issuing_authority,
              issuing_country:
                presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].issuing_country,
            }

      const certificateOfResidenceClaims =
        presentation.claimFormat === ClaimFormat.SdJwtDc
          ? {
              family_name: presentation.prettyClaims.family_name,
              given_name: presentation.prettyClaims.given_name,
              resident_address: `${(presentation.prettyClaims.address as Record<string, string>).street_address}, ${(presentation.prettyClaims.address as Record<string, string>).postal_code} ${(presentation.prettyClaims.address as Record<string, string>).locality}`,
              birth_date: presentation.prettyClaims.birthdate,
              birth_place: (presentation.prettyClaims.place_of_birth as Record<string, string>).locality,
              nationality: (presentation.prettyClaims.nationalities as string[])[0],
              issuing_country: presentation.prettyClaims.issuing_country,
            }
          : {
              given_name: presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].given_name,
              family_name: presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].family_name,
              resident_address: `${presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].resident_street}, ${presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].resident_postal_code} ${presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].resident_city}`,
              birth_date: presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].birth_date,
              birth_place: presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].place_of_birth,
              nationality: presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].nationality,
              issuing_country:
                presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].issuing_country,
            }

      const healthIdClaims = presentation.claimFormat === ClaimFormat.SdJwtDc ? {} : {}

      const msisdnClaimsData =
        presentation.claimFormat === ClaimFormat.SdJwtDc
          ? {
              registered_given_name: presentation.prettyClaims.given_name,
              registered_family_name: presentation.prettyClaims.family_name,
            }
          : {
              registered_given_name:
                presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].given_name,
              registered_family_name:
                presentation.documents[0].issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].family_name,
            }

      const eudiPidData =
        presentation.claimFormat === ClaimFormat.SdJwtDc
          ? {
              family_name: presentation.prettyClaims.family_name,
              given_name: presentation.prettyClaims.given_name,
              birth_date: presentation.prettyClaims.birthdate,

              // Mandatory metadata
              issuance_date: new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds),
              expiry_date: new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds),
              issuing_country: presentation.prettyClaims.issuing_country,
              issuing_authority: presentation.prettyClaims.issuing_authority,

              family_name_birth: presentation.prettyClaims.birth_family_name,

              place_of_birth: presentation.prettyClaims.place_of_birth,

              resident_country: (presentation.prettyClaims.address as Record<string, string>).country,
              resident_city: (presentation.prettyClaims.address as Record<string, string>).locality,
              resident_postal_code: (presentation.prettyClaims.address as Record<string, string>).postal_code,
              resident_street: (presentation.prettyClaims.address as Record<string, string>).street_address,
              nationality: (presentation.prettyClaims.nationalities as string[])[0],
            }
          : {}

      const formatSpecificClaims = Object.fromEntries(
        Object.entries({
          [bdrIssuer.credentialConfigurationsSupported[0].mso_mdoc.data.credentialConfigurationId]:
            driversLicenseClaims,

          [bdrIssuer.credentialConfigurationsSupported[1]['dc+sd-jwt'].data.credentialConfigurationId]: eudiPidData,
          [bdrIssuer.credentialConfigurationsSupported[1].mso_mdoc.data.credentialConfigurationId]: eudiPidData,

          [krankenkasseIssuer.credentialConfigurationsSupported[0]['dc+sd-jwt'].data.credentialConfigurationId]:
            healthIdClaims,
          [krankenkasseIssuer.credentialConfigurationsSupported[0].mso_mdoc.data.credentialConfigurationId]:
            healthIdClaims,

          [steuernIssuer.credentialConfigurationsSupported[0]['dc+sd-jwt'].data.credentialConfigurationId]: taxIdClaims,
          [steuernIssuer.credentialConfigurationsSupported[0].mso_mdoc.data.credentialConfigurationId]: taxIdClaims,

          [kolnIssuer.credentialConfigurationsSupported[0]['dc+sd-jwt'].data.credentialConfigurationId]:
            certificateOfResidenceClaims,
          [kolnIssuer.credentialConfigurationsSupported[0].mso_mdoc.data.credentialConfigurationId]:
            certificateOfResidenceClaims,

          [telOrgIssuer.credentialConfigurationsSupported[0]['dc+sd-jwt'].data.credentialConfigurationId]:
            msisdnClaimsData,
          [telOrgIssuer.credentialConfigurationsSupported[0].mso_mdoc.data.credentialConfigurationId]: msisdnClaimsData,
        }).flatMap(([configurationId, data]) => [
          [configurationId, data],
          [`${configurationId}-key-attestations`, data],
        ])
      )

      if (credentialData.format === ClaimFormat.SdJwtDc) {
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
            validityInfo: Buffer.from(cborEncode(credential.validityInfo, { mapsAsObjects: true })).toString(
              'base64url'
            ),
            namespaces: Buffer.from(
              cborEncode(
                {
                  [namespace]: {
                    ...values,
                    ...formatSpecificClaims[credentialConfigurationId],
                  },
                },
                { mapsAsObjects: true }
              )
            ).toString('base64url'),

            holderKey: holderBinding.jwk.toJson(),
          })),
        } satisfies SerializableMdocSignOptions

        console.log(
          'decoded',
          cborDecode(Buffer.from(signOptions.credentials[0].namespaces, 'base64url'), { mapsAsObjects: true })
        )
      }
    }
  }

  if (!signOptions) {
    if (credentialData.format === ClaimFormat.SdJwtDc) {
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
          validityInfo: Buffer.from(cborEncode(credential.validityInfo, { mapsAsObjects: true })).toString('base64url'),
          namespaces: Buffer.from(cborEncode(credential.namespaces, { mapsAsObjects: true })).toString('base64url'),
          holderKey: holderBinding.jwk.toJson(),
        })),
      } satisfies SerializableMdocSignOptions
    } else {
      throw new Error(`Unsupported credential ${credentialConfigurationId}`)
    }
  }

  const issuanceMetadata: IssuanceMetadata = issuanceSession.issuanceMetadata ?? {}
  if (issuanceMetadata.deferInterval) {
    issuanceMetadata.signOptions = signOptions

    // NOTE: This is a bit hacky. We rely on the fact that we know that Credo
    // updates the stored issuance session after returning a deferral.
    issuanceSession.issuanceMetadata = issuanceMetadata

    return {
      type: 'deferral',
      transactionId: randomUUID() as string,
      interval: issuanceMetadata.deferInterval,
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

  if (!issuanceMetadata.deferInterval) {
    throw new Error('Issuance session metadata does not have deferInterval set')
  }

  if (!issuanceMetadata.signOptions) {
    throw new Error('Issuance session metadata does not have signOptions set')
  }

  const deferUntil = issuanceSession.createdAt.getTime() + issuanceMetadata.deferInterval * 1000

  // If no longer deferred, return the credentials
  if (deferUntil < Date.now()) {
    return serializableSignOptionsToSignOptions(issuanceMetadata.signOptions)
  }

  // Otherwise, keep deferring
  return {
    type: 'deferral',
    transactionId: deferredCredentialRequest.transaction_id,
    interval: issuanceMetadata.deferInterval,
  }
}
