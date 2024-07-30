import { WalletKeyExistsError, X509Api } from '@credo-ts/core'
import { agent } from '../agent'
import { createKeys } from './createKeys'
import { createSelfSignedCertificate } from './createSelfSignedCertificate'

let x509Certificate: string | undefined = undefined

export async function setupX509Certificate() {
  try {
    const key = await createKeys()

    x509Certificate = await createSelfSignedCertificate(key)

    await agent.genericRecords.save({
      id: 'X509_CERTIFICATE',
      content: {
        certificate: x509Certificate,
      },
    })
  } catch (error) {
    // If the key already exists, we assume the self-signed certificate is already created
    if (error instanceof WalletKeyExistsError) {
      const x509Record = await agent.genericRecords.findById('X509_CERTIFICATE')
      if (!x509Record) {
        throw new Error('No available key method record found')
      }
      x509Certificate = x509Record.content.certificate as string
    } else {
      throw error
    }
  }

  const x509 = agent.dependencyManager.resolve(X509Api)
  await x509.addTrustedCertificate(x509Certificate)
}

export function getX509Certificate() {
  if (!x509Certificate) {
    throw new Error('X509 certificate is not setup properly')
  }
  return x509Certificate
}
