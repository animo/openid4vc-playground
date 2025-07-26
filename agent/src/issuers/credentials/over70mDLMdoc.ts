import { ClaimFormat, DateOnly, Kms } from '@credo-ts/core'
import { OpenId4VciCredentialFormatProfile } from '@credo-ts/openid4vc'
import { AGENT_HOST } from '../../constants'
import type { CredentialConfigurationDisplay, MdocConfiguration } from '../../issuer'
import type { StaticMdocSignInput } from '../../types'
import { oneYearInMilliseconds, serverStartupTimeInMilliseconds, tenDaysInMilliseconds } from '../../utils/date'
import { loadJPEGBufferSync } from '../../utils/image'

const erikaPortrait = loadJPEGBufferSync(`${__dirname}/../../../assets/erika.jpeg`)
const erikaSignature = loadJPEGBufferSync(`${__dirname}/../../../assets/signature.jpeg`)

const mobileDriversLicenseDisplay = {
  locale: 'en',
  name: 'Driving Licence age>70',
  text_color: '#6F5C77',
  background_color: '#E6E2E7',
  background_image: {
    url: `${AGENT_HOST}/assets/verfiers/bdr/credential.png`,
    uri: `${AGENT_HOST}/assets/issuers/bdr/credential.png`,
  },
} satisfies CredentialConfigurationDisplay

const mobileDriversLicensePayload = {
  given_name: 'Cora',
  family_name: 'de Oever Rijshoven',
  birth_date: new DateOnly('1954-02-02'),
  age_over_18: true,
  document_number: 'Z021AB37X13',
  portrait: new Uint8Array(erikaPortrait),
  signature_usual_mark: new Uint8Array(erikaSignature),
  resident_postal_code: '90210',
  un_distinguishing_sign: 'D',
  issuing_authority: 'Bundesrepublik Deutschland',
  issue_date: new Date(serverStartupTimeInMilliseconds - tenDaysInMilliseconds),
  expiry_date: new Date(serverStartupTimeInMilliseconds + oneYearInMilliseconds),
  // Must be same as C= in x509 cert (currently set to NL)
  issuing_country: 'NL',
  driving_privileges: [
    {
      vehicle_category_code: 'B',
      issue_date: new DateOnly('2004-01-15'),
      expiry_date: new DateOnly('2009-01-14'),
      codes: [
        {
          code: 'B96',
          value: '4250',
          sign: '≤',
        },
        {
          code: '70',
          value: '01.01',
        },
        {
          code: '95',
          value: '2029-01-15',
        },
        {
          code: '96',
          value: '750',
          sign: '≤',
        },
      ],
    },
  ],
}

export const over70mDLMdoc = {
  format: OpenId4VciCredentialFormatProfile.MsoMdoc,
  cryptographic_binding_methods_supported: ['cose_key'],
  cryptographic_suites_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
  scope: 'mdl-mdoc',
  doctype: 'org.iso.18013.5.1.mDL',
  display: [mobileDriversLicenseDisplay],
  proof_types_supported: {
    jwt: {
      proof_signing_alg_values_supported: [Kms.KnownJwaSignatureAlgorithms.ES256],
    },
  },
} as const satisfies MdocConfiguration

export const over70mDLMdocData = {
  credentialConfigurationId: 'mdl-mdoc',
  format: ClaimFormat.MsoMdoc,
  credential: {
    docType: over70mDLMdoc.doctype,
    namespaces: {
      'org.iso.18013.5.1': mobileDriversLicensePayload,
    },
    validityInfo: {
      validFrom: mobileDriversLicensePayload.issue_date,
      validUntil: mobileDriversLicensePayload.expiry_date,

      // Causes issue in google identity credential if not present
      // Update half year before expiry
      expectedUpdate: new Date(serverStartupTimeInMilliseconds + Math.floor(oneYearInMilliseconds / 2)),
      signed: mobileDriversLicensePayload.issue_date,
    },
  },
} satisfies StaticMdocSignInput
