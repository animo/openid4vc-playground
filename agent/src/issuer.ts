import type { KeyType } from '@credo-ts/core'
import type {
  OpenId4VciCredentialRequestToCredentialMapper,
  OpenId4VciSignMdocCredential,
  OpenId4VciSignSdJwtCredential,
} from '@credo-ts/openid4vc'
import { agent } from './agent'
import { AGENT_HOST } from './constants'
import {
  credentialsSupported,
  issuerDisplay,
  mockEmployeeBadgeMdoc,
  mockIdenticonAttendeeSdJwt,
  mockPidOpenId4VcPlaygroundCredentialMsoMdocJwk,
  mockPidOpenId4VcPlaygroundCredentialSdJwtVcJwk,
} from './issuerMetadata'
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
  credentialConfigurationIds,
}): Promise<OpenId4VciSignMdocCredential | OpenId4VciSignSdJwtCredential> => {
  const credentialConfigurationId = credentialConfigurationIds[0]

  const x509Certificate = getX509Certificate()

  let holderKeyType: KeyType
  if (holderBinding.method === 'jwk') {
    holderKeyType = holderBinding.jwk.keyType
  } else {
    throw new Error(`Unsupported holder binding method: ${holderBinding.method}`)
  }

  if (credentialConfigurationId === mockPidOpenId4VcPlaygroundCredentialSdJwtVcJwk.id) {
    return {
      credentialSupportedId: mockPidOpenId4VcPlaygroundCredentialSdJwtVcJwk.id,
      format: 'vc+sd-jwt',
      holder: holderBinding,
      payload: {
        vct: mockPidOpenId4VcPlaygroundCredentialSdJwtVcJwk.vct,
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
    } as const satisfies OpenId4VciSignSdJwtCredential
  }

  if (credentialConfigurationId === mockIdenticonAttendeeSdJwt.id) {
    return {
      credentialSupportedId: mockIdenticonAttendeeSdJwt.id,
      format: 'vc+sd-jwt',
      holder: holderBinding,
      payload: {
        vct: mockIdenticonAttendeeSdJwt.vct,
        first_name: 'Erika',
        last_name: 'Mustermann',
        sponsorship_tier: 'Platinum',
      },
      issuer: {
        method: 'x5c',
        x5c: [x509Certificate],
        issuer: AGENT_HOST,
      },
      disclosureFrame: {
        _sd: ['first_name', 'last_name'],
      },
    } as const
  }

  if (credentialConfigurationId === mockPidOpenId4VcPlaygroundCredentialMsoMdocJwk.id) {
    return {
      credentialSupportedId: mockPidOpenId4VcPlaygroundCredentialMsoMdocJwk.id,
      format: 'mso_mdoc',
      holderKey: holderBinding.key,
      docType: mockPidOpenId4VcPlaygroundCredentialMsoMdocJwk.doctype,
      issuerCertificate: x509Certificate,
      namespaces: {
        'eu.europa.ec.eudi.pid.1': {
          resident_country: 'DE',
          age_over_12: true,
          family_name_birth: 'GABLER',
          given_name: 'ERIKA',
          age_birth_year: 1984,
          age_over_18: true,
          age_over_21: true,
          resident_city: 'KÖLN',
          family_name: 'MUSTERMANN',
          birth_place: 'BERLIN',
          expiry_date: new Date('2024-08-26T14:49:42.124Z'),
          issuing_country: 'DE',
          age_over_65: false,
          issuance_date: new Date('2024-08-12T14:49:42.124Z'),
          resident_street: 'HEIDESTRASSE 17',
          age_over_16: true,
          resident_postal_code: '51147',
          birth_date: '1984-01-26',
          issuing_authority: 'DE',
          age_over_14: true,
          age_in_years: 40,
          nationality: new Map([
            ['value', 'DE'],
            ['countryName', 'Germany'],
          ]),
        },
      },
      validityInfo: {
        validUntil: new Date('2025-08-26T14:49:42.124Z'),
        validFrom: new Date('2024-08-12T14:49:42.124Z'),
        signed: new Date(),
      },
    } as const satisfies OpenId4VciSignMdocCredential
  }

  if (credentialConfigurationId === mockEmployeeBadgeMdoc.id) {
    return {
      credentialSupportedId: mockEmployeeBadgeMdoc.id,
      format: 'mso_mdoc',
      holderKey: holderBinding.key,
      docType: mockEmployeeBadgeMdoc.doctype,
      issuerCertificate: x509Certificate,
      namespaces: {
        [mockEmployeeBadgeMdoc.doctype]: {
          is_admin: true,
          last_name: 'Mustermann',
          first_name: 'Erika',
          department: 'Sales',
          employee_id: '181888100',
        },
      },
      validityInfo: {
        validUntil: new Date('2025-08-26T14:49:42.124Z'),
        validFrom: new Date('2024-08-12T14:49:42.124Z'),
        signed: new Date(),
      },
    } as const satisfies OpenId4VciSignMdocCredential
  }

  throw new Error(`Unsupported credential ${credentialConfigurationId}`)
}
