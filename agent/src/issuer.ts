import { ClaimFormat, JsonTransformer, W3cCredential, parseDid } from '@credo-ts/core'
import {
  OpenId4VcVerifierApi,
  type OpenId4VciCreateIssuerOptions,
  type OpenId4VciCredentialConfigurationSupportedWithFormats,
  type OpenId4VciCredentialIssuerMetadataDisplay,
  type OpenId4VciCredentialRequestToCredentialMapper,
  type OpenId4VciGetVerificationSessionForIssuanceSessionAuthorization,
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
import { steuernIssuer } from './issuers/steuern'
import { telOrgIssuer } from './issuers/telOrg'
import { getX509Certificates, getX509DcsCertificate, getX509RootCertificate } from './keyMethods'
import type { StaticLdpVcSignInput, StaticMdocSignInput, StaticSdJwtSignInput } from './types'
import { oneYearInMilliseconds, serverStartupTimeInMilliseconds, tenDaysInMilliseconds } from './utils/date'
import { getVerifier } from './verifier'
import { bundesregierungVerifier } from './verifiers/bundesregierung'
import { pidMdocInputDescriptor, pidSdJwtInputDescriptor } from './verifiers/util'

export type CredentialConfigurationDisplay = NonNullable<
  OpenId4VciCredentialConfigurationSupportedWithFormats['display']
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
      .flatMap((a) => Object.values(a).map((b) => b.data.credentialConfigurationId))
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

    const credentialName = credentialConfiguration.display?.[0]?.name ?? 'card'

    const authorizationRequest = await verifierApi.createAuthorizationRequest({
      verifierId: verifier.verifierId,
      requestSigner: {
        method: 'x5c',
        x5c: certificates,
        // FIXME: remove issuer param from credo as we can infer it from the url
        issuer: `${AGENT_HOST}/siop/${verifier.verifierId}/authorize`,
      },
      presentationExchange:
        credentialConfigurationId === arfCompliantPidSdJwtData.credentialConfigurationId ||
        credentialConfigurationId === arfCompliantPidUrnVctSdJwtData.credentialConfigurationId
          ? {
              definition: {
                id: '8cdf9c05-b2b7-453d-9dd1-516965891194',
                name: 'Identity card',
                purpose: 'To issue your ARF compliant PID we need to verify your german PID',
                input_descriptors: [
                  pidSdJwtInputDescriptor({
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
              },
            }
          : {
              definition: {
                id: '479ada7f-fff1-4f4a-ba0b-f0e7a8dbab04',
                name: 'Identity card',
                purpose: `To issue your ${credentialName} we need to verify your identity card`,
                input_descriptors: [
                  pidSdJwtInputDescriptor({
                    id: 'pid-sd-jwt-issuance',
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
                    group: 'PID',
                  }),
                  pidMdocInputDescriptor({
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
                    group: 'PID',
                  }),
                ],
                submission_requirements: [
                  {
                    rule: 'pick',
                    count: 1,
                    from: 'PID',
                  },
                ],
              },
            },
      responseMode: 'direct_post.jwt',
    })

    return {
      ...authorizationRequest,
      scopes,
    }
  }

export const credentialRequestToCredentialMapper: OpenId4VciCredentialRequestToCredentialMapper = async ({
  // FIXME: it would be useful if holderBinding would include some metadata on the key type / alg used
  // for the key binding
  holderBindings,
  credentialConfigurationIds,
  verification,
  issuanceSession,
}): Promise<OpenId4VciSignMdocCredentials | OpenId4VciSignSdJwtCredentials | OpenId4VciSignW3cCredentials> => {
  const credentialConfigurationId = credentialConfigurationIds[0]

  const certificates = getX509Certificates()
  const credentialData = issuersCredentialsData[credentialConfigurationId as keyof typeof issuersCredentialsData]
  if (!credentialData) {
    throw new Error(`Unsupported credential configuration id ${credentialConfigurationId}`)
  }

  if (issuanceSession.presentation?.required) {
    const descriptor = verification?.presentationExchange?.descriptors.find(
      (descriptor) =>
        descriptor.descriptor.id === 'pid-sd-jwt-issuance' || descriptor.descriptor.id === 'eu.europa.ec.eudi.pid.1'
    )

    // We allow receiving the PID in both SD-JWT and mdoc when issuing in sd-jwt or mdoc format
    if (descriptor?.format === ClaimFormat.SdJwtVc || descriptor?.format === ClaimFormat.MsoMdoc) {
      const driversLicenseClaims =
        descriptor.format === ClaimFormat.SdJwtVc
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
        descriptor.format === ClaimFormat.SdJwtVc
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
        descriptor.format === ClaimFormat.SdJwtVc
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

      const healthIdClaims = descriptor.format === ClaimFormat.SdJwtVc ? {} : {}

      const msisdnClaimsData =
        descriptor.format === ClaimFormat.SdJwtVc
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
        descriptor.format === ClaimFormat.SdJwtVc
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

              birth_city: (descriptor.credential.prettyClaims.place_of_birth as Record<string, string>).locality,

              resident_country: (descriptor.credential.prettyClaims.address as Record<string, string>).country,
              resident_city: (descriptor.credential.prettyClaims.address as Record<string, string>).locality,
              resident_postal_code: (descriptor.credential.prettyClaims.address as Record<string, string>).postal_code,
              resident_street: (descriptor.credential.prettyClaims.address as Record<string, string>).street_address,
              nationality: (descriptor.credential.prettyClaims.nationalities as string[])[0],
            }
          : {}

      const formatSpecificClaims = {
        [bdrIssuer.credentialConfigurationsSupported[0]['vc+sd-jwt'].data.credentialConfigurationId]:
          driversLicenseClaims,
        [bdrIssuer.credentialConfigurationsSupported[0].mso_mdoc.data.credentialConfigurationId]: driversLicenseClaims,

        [bdrIssuer.credentialConfigurationsSupported[1]['vc+sd-jwt'].data.credentialConfigurationId]:
          arfCompliantPidData,

        [bdrIssuer.credentialConfigurationsSupported[2]['vc+sd-jwt'].data.credentialConfigurationId]:
          arfCompliantPidData,

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
      }

      if (credentialData.format === ClaimFormat.SdJwtVc) {
        const { credential, ...restCredentialData } = credentialData

        return {
          ...restCredentialData,
          credentials: holderBindings.map((holderBinding) => ({
            ...credential,
            payload: {
              ...credential.payload,
              ...formatSpecificClaims[credentialConfigurationId],
            },
            holder: holderBinding,
            issuer: {
              method: 'x5c',
              x5c: certificates,
              issuer: AGENT_HOST,
            },
          })),
        } satisfies OpenId4VciSignSdJwtCredentials
      }

      if (credentialData.format === ClaimFormat.MsoMdoc) {
        const { credential, ...restCredentialData } = credentialData

        const [namespace, values] = Object.entries(credential.namespaces)[0]
        console.log({
          ...restCredentialData,
          credentials: holderBindings.map((holderBinding) => ({
            ...credential,
            namespaces: {
              [namespace]: {
                ...values,
                ...formatSpecificClaims[credentialConfigurationId],
              },
            },

            holderKey: holderBinding.key,
            issuerCertificate: getX509DcsCertificate(),
          })),
        })
        return {
          ...restCredentialData,
          credentials: holderBindings.map((holderBinding) => ({
            ...credential,
            namespaces: {
              [namespace]: {
                ...values,
                ...formatSpecificClaims[credentialConfigurationId],
              },
            },

            holderKey: holderBinding.key,
            issuerCertificate: getX509DcsCertificate(),
          })),
        } satisfies OpenId4VciSignMdocCredentials
      }
    }
  }

  if (credentialData.format === ClaimFormat.SdJwtVc) {
    const { credential, ...restCredentialData } = credentialData
    return {
      ...restCredentialData,
      credentials: holderBindings.map((holderBinding) => ({
        ...credential,
        holder: holderBinding,
        issuer: {
          method: 'x5c',
          x5c: certificates,
          issuer: AGENT_HOST,
        },
      })),
    } satisfies OpenId4VciSignSdJwtCredentials
  }

  if (credentialData.format === ClaimFormat.MsoMdoc) {
    const { credential, ...restCredentialData } = credentialData
    return {
      ...restCredentialData,
      credentials: holderBindings.map((holderBinding) => ({
        ...credential,
        holderKey: holderBinding.key,
        issuerCertificate: getX509DcsCertificate(),
      })),
    } satisfies OpenId4VciSignMdocCredentials
  }

  if (credentialData.format === ClaimFormat.LdpVc) {
    const { credential, ...restCredentialData } = credentialData

    const didWeb = await getWebDidDocument()
    return {
      ...restCredentialData,
      credentials: holderBindings.map((holderBinding) => {
        if (holderBinding.method !== 'did') {
          throw new Error("Only 'did' holder binding supported for ldp vc")
        }

        const json = JsonTransformer.toJSON(credential.credential)
        json.credentialSubject.id = parseDid(holderBinding.didUrl).did
        json.issuer.id = didWeb.id

        return {
          verificationMethod: `${didWeb.id}#key-1`,
          credential: W3cCredential.fromJson(json),
        }
      }),
    } satisfies OpenId4VciSignW3cCredentials
  }

  throw new Error(`Unsupported credential ${credentialConfigurationId}`)
}
