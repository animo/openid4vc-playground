import { type Key, type X509Certificate, X509ExtendedKeyUsage, X509KeyUsage, X509Service } from '@credo-ts/core'
import { agent } from '../agent'
import { AGENT_DNS, AGENT_HOST } from '../constants'

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
        urls: ['https://animo.id'],
      },
    },
  })
}

export const createDocumentSignerCertificate = async (
  authorityKey: Key,
  subjectKey: Key,
  rootCertificate: X509Certificate
) => {
  const lastYear = new Date()
  const nextYear = new Date()
  nextYear.setFullYear(nextYear.getFullYear() + 3)
  lastYear.setFullYear(lastYear.getFullYear() - 1)

  return X509Service.createCertificate(agent.context, {
    authorityKey,
    subjectPublicKey: subjectKey,
    issuer: rootCertificate.issuer,
    subject: { commonName: 'credo dcs', countryName: 'NL' },
    validity: {
      notBefore: lastYear,
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
