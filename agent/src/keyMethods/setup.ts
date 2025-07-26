import { Kms, X509Certificate, X509Service } from '@credo-ts/core'
import { agent } from '../agent'
import { X509_DCS_CERTIFICATE, X509_ROOT_CERTIFICATE } from '../constants'
import { createKeys } from './createKeys'
import {
  createCertificateRevocationList,
  createDocumentSignerCertificate,
  createRootCertificate,
} from './createSelfSignedCertificate'

let x509RootCertificate: X509Certificate | undefined = undefined
let x509DcsCertificate: X509Certificate | undefined = undefined
let crl: Buffer | undefined = undefined

export async function setupX509Certificate() {
  const x509Record = await agent.genericRecords.findById('X509_CERTIFICATE')

  try {
    const { documentSignerPublicJwk, authorityPublicJwk } = await createKeys()

    if (X509_ROOT_CERTIFICATE) {
      const parsedCertificate = X509Service.parseCertificate(agent.context, {
        encodedCertificate: X509_ROOT_CERTIFICATE,
      })

      x509RootCertificate = parsedCertificate
      x509RootCertificate.publicJwk.keyId = authorityPublicJwk.keyId

      if (!parsedCertificate.publicJwk.equals(authorityPublicJwk)) {
        throw new Error(
          'Key in provided X509_ROOT_CERTIFICATE env variable does not match the key from the ROOT_P256_SEED'
        )
      }

      if (X509_DCS_CERTIFICATE) {
        const parsedCertificate = X509Service.parseCertificate(agent.context, {
          encodedCertificate: X509_DCS_CERTIFICATE,
        })
        x509DcsCertificate = parsedCertificate
        x509DcsCertificate.publicJwk.keyId = documentSignerPublicJwk.keyId

        if (!parsedCertificate.publicJwk.equals(documentSignerPublicJwk)) {
          throw new Error(
            'Key in provided X509_DCS_CERTIFICATE env variable does not match the key from the DCS_P256_SEED'
          )
        }
      } else {
        const dcsCertificate = await createDocumentSignerCertificate(
          authorityPublicJwk,
          documentSignerPublicJwk,
          parsedCertificate
        )
        x509DcsCertificate = dcsCertificate
      }
    } else {
      const rootCertificate = await createRootCertificate(authorityPublicJwk)
      const dcsCertificate = await createDocumentSignerCertificate(
        authorityPublicJwk,
        documentSignerPublicJwk,
        rootCertificate
      )
      x509RootCertificate = rootCertificate
      x509DcsCertificate = dcsCertificate
    }

    const x509RecordContext = {
      root: x509RootCertificate.toString('base64'),
      rootKeyId: x509DcsCertificate.publicJwk.keyId,
      dcs: x509DcsCertificate.toString('base64'),
      dcsKeyId: x509DcsCertificate.publicJwk.keyId,
    }
    if (x509Record) {
      x509Record.content = x509RecordContext
      await agent.genericRecords.update(x509Record)
    } else {
      await agent.genericRecords.save({
        id: 'X509_CERTIFICATE',
        content: x509RecordContext,
      })
    }
    console.log(x509DcsCertificate.toString('pem'), x509RootCertificate.toString('pem'))
  } catch (error) {
    // If the key already exists, we assume the self-signed certificate is already created
    if (error instanceof Kms.KeyManagementKeyExistsError) {
      if (!x509Record) {
        throw new Error('No available key method record found')
      }
      x509RootCertificate = X509Certificate.fromEncodedCertificate(x509Record.content.root as string)
      x509RootCertificate.publicJwk.keyId =
        (x509Record.content.rootKeyId as string | undefined) ?? x509RootCertificate.publicJwk.legacyKeyId
      x509DcsCertificate = X509Certificate.fromEncodedCertificate(x509Record.content.dcs as string)
      x509DcsCertificate.publicJwk.keyId =
        (x509Record.content.dcsKeyId as string | undefined) ?? x509DcsCertificate.publicJwk.legacyKeyId
    } else {
      throw error
    }
  }

  const crlInstance = await createCertificateRevocationList({
    context: agent.context,
    entityName: 'Animo',
    publicJwk: x509RootCertificate.publicJwk,
  })

  crl = Buffer.from(crlInstance.rawData)

  console.log('======= X.509 IACA ROOT Certificate ===========')
  console.log(x509RootCertificate.toString('pem'))

  console.log('======= X.509 IACA DCS  Certificate ===========')
  console.log(x509DcsCertificate.toString('pem'))

  console.log('======= X.509 CRL ===========')
  console.log(crlInstance.toString('pem'))

  if (!x509RootCertificate || !x509DcsCertificate) {
    throw new Error('Error setting up certificates')
  }

  agent.x509.config.addTrustedCertificate(x509RootCertificate)
  agent.x509.config.addTrustedCertificate(x509RootCertificate)
}

export function getX509RootCertificate() {
  if (!x509RootCertificate) {
    throw new Error('X509 root certificate is not setup properly')
  }
  return x509RootCertificate
}

export function getCertificateRevocationList() {
  if (!crl) {
    throw new Error('X509 Certificate Revocation List is not setup properly')
  }

  return crl
}

export function getX509DcsCertificate() {
  if (!x509DcsCertificate) {
    throw new Error('X509 dcs certificate is not setup properly')
  }
  return x509DcsCertificate
}

export function getX509Certificates() {
  return [getX509DcsCertificate(), getX509RootCertificate()]
}
