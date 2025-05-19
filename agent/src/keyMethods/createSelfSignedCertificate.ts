import { type Key, type X509Certificate, X509ExtendedKeyUsage, X509KeyUsage, X509Service } from '@credo-ts/core'
import { agent } from '../agent'
import { AGENT_DNS, AGENT_HOST } from '../constants'

import { type AgentContext, CredoWebCrypto, CredoWebCryptoKey } from '@credo-ts/core'
import { credoKeyTypeIntoCryptoKeyAlgorithm } from '@credo-ts/core/build/crypto/webcrypto/utils/keyAlgorithmConversion'
import * as x509 from '@peculiar/x509'
import { tenDaysInMilliseconds } from '../utils/date'

/**
 * Creates a Certificate Revocation List (CRL) for the agent.
 *
 * @throws Will throw an error if the CRL creation process fails.
 */
export async function createCertificateRevocationList({
  entityName,
  context,
  key,
}: {
  entityName: string
  context: AgentContext
  key: Key
}) {
  try {
    const webCrypto = new CredoWebCrypto(context)
    const cryptoKeyAlgorithm = credoKeyTypeIntoCryptoKeyAlgorithm(key.keyType)
    const privateKey = new CredoWebCryptoKey(key, cryptoKeyAlgorithm, false, 'private', ['sign'])
    const publicKey = new CredoWebCryptoKey(key, cryptoKeyAlgorithm, true, 'public', ['sign'])
    context.config.logger.info('Creating Certificate Revocation List')
    const authorityKeyIdentifierExtension = await x509.AuthorityKeyIdentifierExtension.create(
      publicKey,
      false, // mark extension as non-critical
      webCrypto
    )
    const crlNumberExtension = new x509.Extension(
      '2.5.29.20', // CRL Number OID
      false, // mark extension as non-critical
      new Uint8Array([0x02, 0x01, 0x01]) // ASN.1 INTEGER with value 1
    )
    const crl = await x509.X509CrlGenerator.create(
      {
        signingKey: privateKey,
        issuer: `CN=${entityName},C=NL`,
        thisUpdate: new Date(),
        nextUpdate: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000),
        extensions: [authorityKeyIdentifierExtension, crlNumberExtension],
        entries: [],
        signingAlgorithm: {
          name: 'ECDSA',
          hash: { name: 'SHA-256' },
        },
      },
      webCrypto
    )
    agent.config.logger.info('Certificate Revocation List created')

    return crl
  } catch (error) {
    agent.config.logger.error('Error creating Certificate Revocation List', {
      error,
    })
    throw new Error(`Error creating Certificate Revocation List: ${error}`)
  }
}

export const createRootCertificate = async (key: Key) => {
  const lastYear = new Date()
  const nextYear = new Date()
  nextYear.setFullYear(nextYear.getFullYear() + 3)
  lastYear.setFullYear(lastYear.getFullYear() - 1)

  return X509Service.createCertificate(agent.context, {
    authorityKey: key,
    issuer: { countryName: 'NL', commonName: 'Animo' },
    validity: {
      notBefore: lastYear,
      notAfter: nextYear,
    },
    extensions: {
      subjectKeyIdentifier: {
        include: true,
      },
      keyUsage: {
        usages: [X509KeyUsage.KeyCertSign, X509KeyUsage.CrlSign],
        markAsCritical: true,
      },
      issuerAlternativeName: {
        name: [{ type: 'url', value: AGENT_HOST }],
      },
      basicConstraints: {
        ca: true,
        pathLenConstraint: 0,
        markAsCritical: true,
      },
      crlDistributionPoints: {
        urls: [`${AGENT_HOST}/crl`],
      },
    },
  })
}

export const createDocumentSignerCertificate = async (
  authorityKey: Key,
  subjectKey: Key,
  rootCertificate: X509Certificate
) => {
  const notBefore = new Date(Date.now() - tenDaysInMilliseconds * 2)

  const nextYear = new Date()
  nextYear.setFullYear(nextYear.getFullYear() + 1)

  return X509Service.createCertificate(agent.context, {
    authorityKey,
    subjectPublicKey: subjectKey,
    issuer: rootCertificate.issuer,
    subject: { commonName: 'credo dcs', countryName: 'NL' },
    validity: {
      notBefore,
      notAfter: nextYear,
    },
    extensions: {
      authorityKeyIdentifier: {
        include: true,
      },
      subjectKeyIdentifier: {
        include: true,
      },
      keyUsage: {
        usages: [X509KeyUsage.DigitalSignature],
        markAsCritical: true,
      },
      subjectAlternativeName: {
        name: [{ type: 'dns', value: AGENT_DNS }],
      },
      issuerAlternativeName: {
        // biome-ignore lint/style/noNonNullAssertion:
        name: rootCertificate.issuerAlternativeNames!,
      },
      extendedKeyUsage: {
        usages: [X509ExtendedKeyUsage.MdlDs],
        markAsCritical: true,
      },
    },
  })
}
