import { AskarModule } from '@credo-ts/askar'
import { Agent, ConsoleLogger, LogLevel, X509Module, joinUriParts } from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/node'
import { OpenId4VcHolderModule, OpenId4VcIssuerModule, OpenId4VcVerifierModule } from '@credo-ts/openid4vc'
import { askar } from '@openwallet-foundation/askar-nodejs'
import { Router } from 'express'
import { AGENT_HOST, AGENT_WALLET_KEY } from './constants'
import { credentialRequestToCredentialMapper, getVerificationSessionForIssuanceSession } from './issuer'
import { verifierTrustChains } from './verifiers'
import { getAuthorityHints, isSubordinateTo } from './verifiers/trustChains'

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection', reason)
})

export const openId4VciRouter = Router()
export const openId4VpRouter = Router()

const x509PidIssuerRootCertificate =
  'MIICeTCCAiCgAwIBAgIUB5E9QVZtmUYcDtCjKB/H3VQv72gwCgYIKoZIzj0EAwIwgYgxCzAJBgNVBAYTAkRFMQ8wDQYDVQQHDAZCZXJsaW4xHTAbBgNVBAoMFEJ1bmRlc2RydWNrZXJlaSBHbWJIMREwDwYDVQQLDAhUIENTIElERTE2MDQGA1UEAwwtU1BSSU5EIEZ1bmtlIEVVREkgV2FsbGV0IFByb3RvdHlwZSBJc3N1aW5nIENBMB4XDTI0MDUzMTA2NDgwOVoXDTM0MDUyOTA2NDgwOVowgYgxCzAJBgNVBAYTAkRFMQ8wDQYDVQQHDAZCZXJsaW4xHTAbBgNVBAoMFEJ1bmRlc2RydWNrZXJlaSBHbWJIMREwDwYDVQQLDAhUIENTIElERTE2MDQGA1UEAwwtU1BSSU5EIEZ1bmtlIEVVREkgV2FsbGV0IFByb3RvdHlwZSBJc3N1aW5nIENBMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEYGzdwFDnc7+Kn5ibAvCOM8ke77VQxqfMcwZL8IaIA+WCROcCfmY/giH92qMru5p/kyOivE0RC/IbdMONvDoUyaNmMGQwHQYDVR0OBBYEFNRWGMCJOOgOWIQYyXZiv6u7xZC+MB8GA1UdIwQYMBaAFNRWGMCJOOgOWIQYyXZiv6u7xZC+MBIGA1UdEwEB/wQIMAYBAf8CAQAwDgYDVR0PAQH/BAQDAgGGMAoGCCqGSM49BAMCA0cAMEQCIGEm7wkZKHt/atb4MdFnXW6yrnwMUT2u136gdtl10Y6hAiBuTFqvVYth1rbxzCP0xWZHmQK9kVyxn8GPfX27EIzzsw=='
const x509PidIssuerCertificate =
  'MIICdDCCAhugAwIBAgIBAjAKBggqhkjOPQQDAjCBiDELMAkGA1UEBhMCREUxDzANBgNVBAcMBkJlcmxpbjEdMBsGA1UECgwUQnVuZGVzZHJ1Y2tlcmVpIEdtYkgxETAPBgNVBAsMCFQgQ1MgSURFMTYwNAYDVQQDDC1TUFJJTkQgRnVua2UgRVVESSBXYWxsZXQgUHJvdG90eXBlIElzc3VpbmcgQ0EwHhcNMjQwNTMxMDgxMzE3WhcNMjUwNzA1MDgxMzE3WjBsMQswCQYDVQQGEwJERTEdMBsGA1UECgwUQnVuZGVzZHJ1Y2tlcmVpIEdtYkgxCjAIBgNVBAsMAUkxMjAwBgNVBAMMKVNQUklORCBGdW5rZSBFVURJIFdhbGxldCBQcm90b3R5cGUgSXNzdWVyMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEOFBq4YMKg4w5fTifsytwBuJf/7E7VhRPXiNm52S3q1ETIgBdXyDK3kVxGxgeHPivLP3uuMvS6iDEc7qMxmvduKOBkDCBjTAdBgNVHQ4EFgQUiPhCkLErDXPLW2/J0WVeghyw+mIwDAYDVR0TAQH/BAIwADAOBgNVHQ8BAf8EBAMCB4AwLQYDVR0RBCYwJIIiZGVtby5waWQtaXNzdWVyLmJ1bmRlc2RydWNrZXJlaS5kZTAfBgNVHSMEGDAWgBTUVhjAiTjoDliEGMl2Yr+ru8WQvjAKBggqhkjOPQQDAgNHADBEAiAbf5TzkcQzhfWoIoyi1VN7d8I9BsFKm1MWluRph2byGQIgKYkdrNf2xXPjVSbjW/U/5S5vAEC5XxcOanusOBroBbU='
const x509BdrMdlIssuerCertificate = `-----BEGIN CERTIFICATE-----
MIICKTCCAc+gAwIBAgIUbsApBxL0COE3jxup8qQBlIlEy/8wCgYIKoZIzj0EAwIw
PTELMAkGA1UEBhMCREUxLjAsBgNVBAMMJUJEUiBJQUNBIElTTy9JRUMgMTgwMTMt
NSB2MSBURVNULU9OTFkwHhcNMjUwMTIxMTQyOTM0WhcNMjYwMTIxMTQyOTM0WjA7
MQswCQYDVQQGEwJERTEsMCoGA1UEAwwjQkRSIERTIElTTy9JRUMgMTgwMTMtNSB2
MSBURVNULU9OTFkwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAR9vm6Dm0/6x/VO
p/cpv3+r9Cqen4WN6Ap8N2f899d1aGmTA0hwAw143Dj5AiJtVRNwurjld35+Fu7c
tHzS7RKto4GuMIGrMA4GA1UdDwEB/wQEAwIHgDAVBgNVHSUBAf8ECzAJBgcogYxd
BQECMB0GA1UdEgQWMBSBEm1kbC1leGFtcGxlQGJkci5kZTAjBgNVHR8EHDAaMBig
FqAUghJtZGwuZXhhbXBsZS5iZHIuZGUwHwYDVR0jBBgwFoAUl4pXNIj/CSM7oB/e
eYOb4ScpQGkwHQYDVR0OBBYEFBcVf+pAFlU5mTWz63oyb9yx7UsEMAoGCCqGSM49
BAMCA0gAMEUCIQD4pFHRCnOkuP4l1GHy66dd60bLkRNsQbHOFvYE7OP44QIgJHyJ
/TOG+Co5yNXYLwzaTtgQ4mNnm/uqjepnMHm02Bc=
-----END CERTIFICATE-----`

export const agent = new Agent({
  dependencies: agentDependencies,
  config: {
    label: 'OpenID4VC Playground',
    logger: new ConsoleLogger(LogLevel.trace),
    // TODO: add postgres storage
    walletConfig: {
      id: 'openid4vc-playground',
      key: AGENT_WALLET_KEY,
    },
  },
  modules: {
    askar: new AskarModule({
      askar,
    }),
    openId4VcIssuer: new OpenId4VcIssuerModule({
      baseUrl: joinUriParts(AGENT_HOST, ['oid4vci']),
      router: openId4VciRouter,
      credentialRequestToCredentialMapper,
      getVerificationSessionForIssuanceSessionAuthorization: getVerificationSessionForIssuanceSession,
    }),
    openId4VcHolder: new OpenId4VcHolderModule(),
    openId4VcVerifier: new OpenId4VcVerifierModule({
      baseUrl: joinUriParts(AGENT_HOST, ['siop']),
      router: openId4VpRouter,
      federation: {
        async getAuthorityHints(agentContext, { verifierId }) {
          return getAuthorityHints(verifierTrustChains, verifierId).map((verifierId) =>
            joinUriParts(AGENT_HOST, ['siop', verifierId])
          )
        },
        async isSubordinateEntity(agentContext, options) {
          return isSubordinateTo(verifierTrustChains, options.verifierId, options.subjectEntityId).length > 0
        },
      },
    }),
    x509: new X509Module({
      trustedCertificates: [x509PidIssuerCertificate, x509BdrMdlIssuerCertificate, x509PidIssuerRootCertificate],
    }),
  },
})
