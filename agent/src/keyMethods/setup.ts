import { WalletKeyExistsError, X509Service } from '@credo-ts/core'
import { agent } from '../agent'
import { X509_DCS_CERTIFICATE, X509_ROOT_CERTIFICATE } from '../constants'
import { createKeys } from './createKeys'
import { createDocumentSignerCertificate, createRootCertificate } from './createSelfSignedCertificate'

let x509RootCertificate: string | undefined = undefined
let x509DcsCertificate: string | undefined = undefined

export async function setupX509Certificate() {
  const x509Record = await agent.genericRecords.findById('X509_CERTIFICATE')

  try {
    const { documentSignerKey, authorityKey } = await createKeys()

    if (X509_ROOT_CERTIFICATE) {
      const parsedCertificate = X509Service.parseCertificate(agent.context, {
        encodedCertificate: X509_ROOT_CERTIFICATE,
      })
      x509RootCertificate = parsedCertificate.toString('base64')

      if (
        parsedCertificate.publicKey.keyType !== authorityKey.keyType ||
        !Buffer.from(parsedCertificate.publicKey.publicKey).equals(Buffer.from(authorityKey.publicKey))
      ) {
        throw new Error(
          'Key in provided X509_ROOT_CERTIFICATE env variable does not match the key from the ROOT_P256_SEED'
        )
      }
      if (X509_DCS_CERTIFICATE) {
        const parsedCertificate = X509Service.parseCertificate(agent.context, {
          encodedCertificate: X509_DCS_CERTIFICATE,
        })
        x509DcsCertificate = parsedCertificate.toString('base64')

        if (
          parsedCertificate.publicKey.keyType !== documentSignerKey.keyType ||
          !Buffer.from(parsedCertificate.publicKey.publicKey).equals(Buffer.from(documentSignerKey.publicKey))
        ) {
          throw new Error(
            'Key in provided X509_DCS_CERTIFICATE env variable does not match the key from the DCS_P256_SEED'
          )
        }
      } else {
        const dcsCertificate = await createDocumentSignerCertificate(authorityKey, documentSignerKey, parsedCertificate)
        x509DcsCertificate = dcsCertificate.toString('base64')
      }
    } else {
      const rootCertificate = await createRootCertificate(authorityKey)
      const dcsCertificate = await createDocumentSignerCertificate(authorityKey, documentSignerKey, rootCertificate)
      x509RootCertificate = rootCertificate.toString('base64')
      x509DcsCertificate = dcsCertificate.toString('base64')
    }

    if (x509Record) {
      x509Record.content = { root: x509RootCertificate, dcs: x509DcsCertificate }
      await agent.genericRecords.update(x509Record)
    } else {
      await agent.genericRecords.save({
        id: 'X509_CERTIFICATE',
        content: { root: x509RootCertificate, dcs: x509DcsCertificate },
      })
    }
    console.log(x509DcsCertificate, x509RootCertificate)
  } catch (error) {
    // If the key already exists, we assume the self-signed certificate is already created
    if (error instanceof WalletKeyExistsError) {
      if (!x509Record) {
        throw new Error('No available key method record found')
      }
      x509RootCertificate = x509Record.content.root as string
      x509DcsCertificate = x509Record.content.dcs as string
    } else {
      throw error
    }
  }

  console.log('======= X.509 IACA ROOT Certificate ===========')
  console.log(x509RootCertificate)

  console.log('======= X.509 IACA DCS  Certificate ===========')
  console.log(x509DcsCertificate)

  if (!x509RootCertificate || !x509DcsCertificate) {
    throw new Error('Error setting up certificates')
  }

  agent.x509.addTrustedCertificate(x509RootCertificate)
  agent.x509.addTrustedCertificate(x509RootCertificate)
}

export function getX509RootCertificate() {
  if (!x509RootCertificate) {
    throw new Error('X509 root certificate is not setup properly')
  }
  return x509RootCertificate
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
