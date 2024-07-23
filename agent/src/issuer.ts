import type { KeyType } from '@credo-ts/core'
import type { OpenId4VciCredentialRequestToCredentialMapper } from '@credo-ts/openid4vc'
import { agent } from './agent'
import { AGENT_HOST } from './constants'
import { credentialsSupported, issuerDisplay, mockPidOpenId4VcPlaygroundCredentialSdJwtVcJwk } from './issuerMetadata'
import { getX509Certificate } from './keyMethods'

const issuerId = 'e451c49f-1186-4fe4-816d-a942151dfd59'

export async function createIssuer() {
  return agent.modules.openId4VcIssuer.createIssuer({
    issuerId,
    credentialsSupported,
    display: issuerDisplay,
  })
}

export async function doesIssuerExist() {
  try {
    await agent.modules.openId4VcIssuer.getIssuerByIssuerId(issuerId)
    return true
  } catch (error) {
    return false
  }
}

export async function getIssuer() {
  return agent.modules.openId4VcIssuer.getIssuerByIssuerId(issuerId)
}

export async function updateIssuer() {
  await agent.modules.openId4VcIssuer.updateIssuerMetadata({
    issuerId,
    credentialsSupported,
    display: issuerDisplay,
  })
}

export const credentialRequestToCredentialMapper: OpenId4VciCredentialRequestToCredentialMapper = async ({
  // FIXME: it would be useful if holderBinding would include some metadata on the key type / alg used
  // for the key binding
  holderBinding,
}) => {
  const credentialSupported = credentialsSupported[0]

  const x509Certificate = getX509Certificate()

  let holderKeyType: KeyType
  if (holderBinding.method === 'jwk') {
    holderKeyType = holderBinding.jwk.keyType
  } else {
    throw new Error(`Unsupported holder binding method: ${holderBinding.method}`)
  }

  if (
    credentialSupported.format === 'vc+sd-jwt' &&
    credentialSupported.id === mockPidOpenId4VcPlaygroundCredentialSdJwtVcJwk.id
  ) {
    return {
      credentialSupportedId: credentialSupported.id,
      format: 'vc+sd-jwt',
      holder: holderBinding,
      payload: {
        vct: credentialSupported.vct,
        given_name: 'Erika',
        family_name: 'Mustermann',
        birthdate: '1963-08-12',
        source_document_type: 'id_card',
        address: {
          street_address: 'Heidestraße 17',
          locality: 'Köln',
          postal_code: '51147',
          country: 'DE',
        },
        nationalities: ['DE'],
        gender: 'female',
        birth_family_name: 'Gabler',
        place_of_birth: {
          locality: 'Berlin',
          country: 'DE',
        },
        also_known_as: 'Schwester Agnes',
        age_equal_or_over: {
          '12': true,
          '14': true,
          '16': true,
          '18': true,
          '21': true,
          '65': false,
        },
      },
      issuer: {
        method: 'x5c',
        x5c: [x509Certificate],
        issuer: AGENT_HOST,
      },
      disclosureFrame: {
        _sd: [
          'given_name',
          'family_name',
          'birthdate',
          'source_document_type',
          'address',
          'nationalities',
          'gender',
          'birth_family_name',
          'place_of_birth',
          'also_known_as',
        ],
        age_equal_or_over: { _sd: ['12', '14', '16', '18', '21', '65'] },
      },
    }
  }

  throw new Error(`Unsupported credential ${credentialSupported.id}`)
}
