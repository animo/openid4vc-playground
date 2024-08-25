import { WalletKeyExistsError, X509Api, X509Service } from '@credo-ts/core'
import { agent } from '../agent'
import { X509_CERTIFICATE } from '../constants'
import { createKeys } from './createKeys'
import { createSelfSignedCertificate } from './createSelfSignedCertificate'

let x509Certificate: string | undefined = undefined

export async function setupX509Certificate() {
  const x509Record = await agent.genericRecords.findById('X509_CERTIFICATE')

  try {
    const key = await createKeys()

    if (X509_CERTIFICATE) {
      const parsedCertificate = X509Service.parseCertificate(agent.context, { encodedCertificate: X509_CERTIFICATE })
      x509Certificate = parsedCertificate.toString('base64')

      if (
        parsedCertificate.publicKey.keyType !== key.keyType ||
        !parsedCertificate.publicKey.publicKey.equals(key.publicKey)
      ) {
        throw new Error('Key in provided X509_CERTIFICATE env variable does not match the key from the P256_SEED')
      }
    } else {
      x509Certificate = await createSelfSignedCertificate(key)
    }

    if (x509Record) {
      x509Record.content = { certificate: x509Certificate }
      await agent.genericRecords.update(x509Record)
    } else {
      await agent.genericRecords.save({
        id: 'X509_CERTIFICATE',
        content: {
          certificate: x509Certificate,
        },
      })
    }
  } catch (error) {
    // If the key already exists, we assume the self-signed certificate is already created
    if (error instanceof WalletKeyExistsError) {
      if (!x509Record) {
        throw new Error('No available key method record found')
      }
      x509Certificate = x509Record.content.certificate as string
    } else {
      throw error
    }
  }

  console.log('======= X.509 Certificate ===========')
  console.log(x509Certificate)

  const x509 = agent.dependencyManager.resolve(X509Api)
  await x509.addTrustedCertificate(x509Certificate)
}

export function getX509Certificate() {
  if (!x509Certificate) {
    throw new Error('X509 certificate is not setup properly')
  }
  return x509Certificate
}
