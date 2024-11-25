import { ClaimFormat, X509Certificate } from '@credo-ts/core'
import {
  OpenId4VcVerifierApi,
  type OpenId4VciCreateIssuerOptions,
  type OpenId4VciCredentialRequestToCredentialMapper,
  type OpenId4VciGetVerificationSessionForIssuanceSessionAuthorization,
  type OpenId4VciSignMdocCredentials,
  type OpenId4VciSignSdJwtCredentials,
} from '@credo-ts/openid4vc'
import { agent } from './agent'
import { AGENT_HOST } from './constants'
import { issuers, issuersCredentialsData } from './issuers'
import { mobileDriversLicenseMdoc, mobileDriversLicenseSdJwt } from './issuers/infrastruktur'
import { getX509Certificate } from './keyMethods'
import { DateOnly, oneYearInMilliseconds, serverStartupTimeInMilliseconds, tenDaysInMilliseconds } from './utils/date'
import { getVerifier } from './verifier'
import { animoVerifier } from './verifiers/animo'
import { pidMdocInputDescriptor, pidSdJwtInputDescriptor } from './verifiers/util'

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
    Object.keys(credentialConfigurationsSupported).includes(credentialConfigurationId)
  )

  if (!issuer) {
    throw new Error(`Issuer not found for credential configuration id ${credentialConfigurationId}`)
  }

  return issuer.issuerId
}

export const getVerificationSessionForIssuanceSession: OpenId4VciGetVerificationSessionForIssuanceSessionAuthorization =
  async ({ agentContext, scopes }) => {
    const verifier = await getVerifier(animoVerifier.verifierId)
    const x509Certificate = getX509Certificate()
    const verifierApi = agentContext.dependencyManager.resolve(OpenId4VcVerifierApi)

    const authorizationRequest = await verifierApi.createAuthorizationRequest({
      verifierId: verifier.verifierId,
      requestSigner: {
        method: 'x5c',
        x5c: [x509Certificate],
        // FIXME: remove issuer param from credo as we can infer it from the url
        issuer: `${AGENT_HOST}/siop/${verifier.verifierId}/authorize`,
      },
      presentationExchange: {
        definition: {
          id: '479ada7f-fff1-4f4a-ba0b-f0e7a8dbab04',
          name: 'Identity card',
          purpose: 'To issue your drivers license we need to verify your identity card',
          input_descriptors: [
            pidSdJwtInputDescriptor({
              id: 'pid-sd-jwt-issuance',
              fields: ['given_name', 'family_name', 'birthdate'],
              group: 'PID',
            }),
            pidMdocInputDescriptor({
              fields: ['given_name', 'family_name', 'birth_date', 'issuing_country', 'issuing_authority'],
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
}): Promise<OpenId4VciSignMdocCredentials | OpenId4VciSignSdJwtCredentials> => {
  const credentialConfigurationId = credentialConfigurationIds[0]

  const x509Certificate = getX509Certificate()
  const credentialData = issuersCredentialsData[credentialConfigurationId as keyof typeof issuersCredentialsData]
  if (!credentialData) {
    throw new Error(`Unsupported credential configuration id ${credentialConfigurationId}`)
  }

  if (
    credentialData.authorization.type === 'presentation' &&
    (credentialData.credentialConfigurationId === mobileDriversLicenseMdoc.id ||
      credentialData.credentialConfigurationId === mobileDriversLicenseSdJwt.id)
  ) {
    const descriptor = verification?.presentationExchange?.descriptors.find(
      (descriptor) => descriptor.descriptor.id === 'pid-sd-jwt-issuance'
    )

    // We allow receiving the PID in both SD-JWT and mdoc when issuing in sd-jwt or mdoc format
    if (descriptor?.format === ClaimFormat.SdJwtVc || descriptor?.format === ClaimFormat.MsoMdoc) {
      const formatSpecificClaims =
        descriptor.format === ClaimFormat.SdJwtVc
          ? {
              given_name: descriptor.credential.prettyClaims.given_name,
              family_name: descriptor.credential.prettyClaims.family_name,
              birth_date: descriptor.credential.prettyClaims.birthdate,

              issuing_authority: descriptor.credential.prettyClaims.issuing_authority,
              issuing_country: descriptor.credential.prettyClaims.issuing_country,
            }
          : {
              given_name: descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].given_name,
              family_name: descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].family_name,
              birth_date: descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].birth_date,

              issuing_authority:
                descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].issuing_authority,
              issuing_country: descriptor.credential.issuerSignedNamespaces['eu.europa.ec.eudi.pid.1'].issuing_country,
            }

      if (credentialData.format === ClaimFormat.SdJwtVc) {
        const { authorization, credential, ...restCredentialData } = credentialData

        return {
          ...restCredentialData,
          credentials: holderBindings.map((holderBinding) => ({
            ...credential,
            payload: {
              ...credential.payload,
              ...formatSpecificClaims,
              issue_date: new DateOnly(new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds).toISOString()),
              expiry_date: new DateOnly(
                new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds).toISOString()
              ),
            },
            holder: holderBinding,
            issuer: {
              method: 'x5c',
              x5c: [x509Certificate],
              issuer: AGENT_HOST,
            },
          })),
        } satisfies OpenId4VciSignSdJwtCredentials
      }

      if (credentialData.format === ClaimFormat.MsoMdoc) {
        const { authorization, credential, ...restCredentialData } = credentialData

        return {
          ...restCredentialData,
          credentials: holderBindings.map((holderBinding) => ({
            ...credential,
            namespaces: {
              'org.iso.18013.5.1': {
                ...credential.namespaces['org.iso.18013.5.1'],
                ...formatSpecificClaims,

                // NOTE: MUST be same as the C= value in the issuer cert for mdoc (checked by libs)
                issuing_country: 'NL',

                issue_date: new DateOnly(
                  new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds).toISOString()
                ),
                expiry_date: new DateOnly(
                  new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds).toISOString()
                ),
              },
            },

            holderKey: holderBinding.key,
            issuerCertificate: x509Certificate,
          })),
        } satisfies OpenId4VciSignMdocCredentials
      }
    }
  }

  if (credentialData.format === ClaimFormat.SdJwtVc) {
    const { authorization, credential, ...restCredentialData } = credentialData
    return {
      ...restCredentialData,
      credentials: holderBindings.map((holderBinding) => ({
        ...credential,
        holder: holderBinding,
        issuer: {
          method: 'x5c',
          x5c: [x509Certificate],
          issuer: AGENT_HOST,
        },
      })),
    } satisfies OpenId4VciSignSdJwtCredentials
  }

  if (credentialData.format === ClaimFormat.MsoMdoc) {
    const { authorization, credential, ...restCredentialData } = credentialData
    return {
      ...restCredentialData,
      credentials: holderBindings.map((holderBinding) => ({
        ...credential,
        holderKey: holderBinding.key,
        issuerCertificate: x509Certificate,
      })),
    } satisfies OpenId4VciSignMdocCredentials
  }

  throw new Error(`Unsupported credential ${credentialConfigurationId}`)
}
