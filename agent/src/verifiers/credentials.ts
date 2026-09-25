import type { CredentialConfigurationDisplay } from '../issuer.js'
import { eudiAgeMdoc } from '../issuers/credentials/eudiAgeMdoc.js'
import { eudiPidMdoc } from '../issuers/credentials/eudiPidMdoc.js'
import { eudiPidSdJwt } from '../issuers/credentials/eudiPidSdJwt.js'
import { mobileDriversLicenseMdoc } from '../issuers/credentials/mDLMdoc.js'
import { photoIdMdoc } from '../issuers/credentials/photoIdMdoc.js'
import { mvrcMdoc } from '../issuers/mvrc.js'
import { weroPasoConfiguration, weroScaConfiguration } from '../issuers/openHorizonBank.js'

export type PresentationCredentialFormat = 'dc+sd-jwt' | 'mso_mdoc'

export interface PresentationCredentialAttribute {
  id: string
  name: string

  /**
   * Whether the attribute is mandatory according to the rulebook of the credential,
   * meaning every issued credential is expected to contain it.
   */
  required: boolean

  /**
   * Dot separated claim path in the SD-JWT VC. Omitted if the attribute is not available in SD-JWT VC.
   */
  sdJwt?: string

  /**
   * Data element identifier within the mdoc namespace. Omitted if the attribute is not available in mdoc.
   */
  mdoc?: string

  /**
   * Namespace of the mdoc data element, if it's not in the default namespace of the credential.
   */
  mdocNamespace?: string
}

export interface PresentationCredentialPreset {
  id: string
  name: string
  attributes: string[]
}

export interface PresentationCredential {
  id: string
  display: CredentialConfigurationDisplay
  formats: {
    'dc+sd-jwt'?: { vcts: string[] }
    mso_mdoc?: { doctype: string; namespace: string }
  }
  attributes: PresentationCredentialAttribute[]

  /**
   * Subsets of attributes that are commonly requested together. Presets for all attributes and all
   * required attributes are added automatically.
   */
  presets: PresentationCredentialPreset[]
}

/**
 * An attribute that uses the same claim name in every format the credential is available in.
 */
function attribute(id: string, name: string, required: boolean): PresentationCredentialAttribute {
  return { id, name, required, sdJwt: id, mdoc: id }
}

/**
 * An mdoc data element in a namespace other than the default namespace of the credential.
 */
function namespacedAttribute(
  namespace: string,
  id: string,
  name: string,
  required: boolean
): PresentationCredentialAttribute {
  return { id, name, required, mdoc: id, mdocNamespace: namespace }
}

/** Shared by the TS 12 and PaSO Wero cards, which hold the same attributes under different types. */
const weroCardAttributes = [
  attribute('account_holder', 'Account holder', true),
  attribute('iban', 'IBAN', true),
  attribute('bic', 'BIC', true),
  attribute('currency', 'Currency', true),
  attribute('payment_network', 'Payment network', true),
]

const weroPaymentDetailsPreset = {
  id: 'payment-details',
  name: 'Payment details',
  attributes: ['iban', 'bic', 'payment_network', 'currency'],
}

const photoIdNamespace = 'org.iso.23220.1'
const photoIdSpecificNamespace = 'org.iso.23220.photoID.1'
const photoIdDataGroupsNamespace = 'org.iso.23220.datagroups.1'

// Attributes follow the rulebook or standard of each credential, so they include attributes that
// the credentials issued by the playground don't contain.
const presentationCredentialDefinitions: PresentationCredential[] = [
  {
    // PID Rulebook (EUDI Attestation Rulebooks Catalog), chapters 2-4
    id: 'eudi-pid',
    display: eudiPidSdJwt.display[0],
    formats: {
      'dc+sd-jwt': { vcts: [eudiPidSdJwt.vct, 'https://demo.pid-issuer.bundesdruckerei.de/credentials/pid/1.0'] },
      mso_mdoc: { doctype: eudiPidMdoc.doctype, namespace: eudiPidMdoc.doctype },
    },
    attributes: [
      // Mandatory attributes
      attribute('family_name', 'Family name', true),
      attribute('given_name', 'Given name', true),
      { id: 'birth_date', name: 'Birth date', required: true, sdJwt: 'birthdate', mdoc: 'birth_date' },
      { id: 'birth_place', name: 'Place of birth', required: true, sdJwt: 'place_of_birth', mdoc: 'place_of_birth' },
      { id: 'nationality', name: 'Nationality', required: true, sdJwt: 'nationalities', mdoc: 'nationality' },
      { id: 'portrait', name: 'Portrait', required: true, sdJwt: 'picture', mdoc: 'portrait' },

      // Optional attributes
      {
        id: 'resident_address',
        name: 'Address',
        required: false,
        sdJwt: 'address.formatted',
        mdoc: 'resident_address',
      },
      {
        id: 'resident_street',
        name: 'Street',
        required: false,
        sdJwt: 'address.street_address',
        mdoc: 'resident_street',
      },
      { id: 'resident_house_number', name: 'House number', required: false, sdJwt: 'address.house_number' },
      {
        id: 'resident_postal_code',
        name: 'Postal code',
        required: false,
        sdJwt: 'address.postal_code',
        mdoc: 'resident_postal_code',
      },
      { id: 'resident_city', name: 'City', required: false, sdJwt: 'address.locality', mdoc: 'resident_city' },
      { id: 'resident_state', name: 'State', required: false, sdJwt: 'address.region', mdoc: 'resident_state' },
      { id: 'resident_country', name: 'Country', required: false, sdJwt: 'address.country', mdoc: 'resident_country' },
      attribute('personal_administrative_number', 'Personal administrative number', false),
      {
        id: 'family_name_birth',
        name: 'Family name at birth',
        required: false,
        sdJwt: 'birth_family_name',
        mdoc: 'family_name_birth',
      },
      {
        id: 'given_name_birth',
        name: 'Given name at birth',
        required: false,
        sdJwt: 'birth_given_name',
        mdoc: 'given_name_birth',
      },
      attribute('sex', 'Sex', false),
      { id: 'email_address', name: 'Email address', required: false, sdJwt: 'email', mdoc: 'email_address' },
      {
        id: 'mobile_phone_number',
        name: 'Mobile phone number',
        required: false,
        sdJwt: 'phone_number',
        mdoc: 'mobile_phone_number',
      },

      // Mandatory metadata
      attribute('issuing_authority', 'Issuing authority', true),
      attribute('issuing_country', 'Issuing country', true),

      // Optional metadata
      { id: 'expiry_date', name: 'Expiry date', required: false, sdJwt: 'date_of_expiry', mdoc: 'expiry_date' },
      {
        id: 'issuance_date',
        name: 'Issuance date',
        required: false,
        sdJwt: 'date_of_issuance',
        mdoc: 'issuance_date',
      },
      attribute('document_number', 'Document number', false),
      attribute('issuing_jurisdiction', 'Issuing jurisdiction', false),
      attribute('trust_anchor', 'Trust anchor', false),
      attribute('attestation_legal_category', 'Attestation legal category', false),
    ],
    presets: [
      { id: 'names', name: 'Names', attributes: ['given_name', 'family_name'] },
      { id: 'names-birth-date', name: 'Names and birth date', attributes: ['given_name', 'family_name', 'birth_date'] },
      { id: 'postal-code', name: 'Postal code', attributes: ['resident_postal_code'] },
      {
        id: 'address',
        name: 'Address',
        attributes: [
          'resident_street',
          'resident_house_number',
          'resident_postal_code',
          'resident_city',
          'resident_state',
          'resident_country',
        ],
      },
    ],
  },
  {
    // ISO/IEC 18013-5:2021, Table 5
    id: 'mdl',
    display: mobileDriversLicenseMdoc.display[0],
    formats: {
      mso_mdoc: { doctype: mobileDriversLicenseMdoc.doctype, namespace: 'org.iso.18013.5.1' },
    },
    attributes: [
      attribute('family_name', 'Family name', true),
      attribute('given_name', 'Given names', true),
      attribute('birth_date', 'Birth date', true),
      attribute('issue_date', 'Issue date', true),
      attribute('expiry_date', 'Expiry date', true),
      attribute('issuing_country', 'Issuing country', true),
      attribute('issuing_authority', 'Issuing authority', true),
      attribute('document_number', 'Licence number', true),
      attribute('portrait', 'Portrait', true),
      attribute('driving_privileges', 'Driving privileges', true),
      attribute('un_distinguishing_sign', 'UN distinguishing sign', true),
      attribute('administrative_number', 'Administrative number', false),
      attribute('sex', 'Sex', false),
      attribute('height', 'Height (cm)', false),
      attribute('weight', 'Weight (kg)', false),
      attribute('eye_colour', 'Eye colour', false),
      attribute('hair_colour', 'Hair colour', false),
      attribute('birth_place', 'Place of birth', false),
      attribute('resident_address', 'Address', false),
      attribute('portrait_capture_date', 'Portrait capture date', false),
      attribute('age_in_years', 'Age in years', false),
      attribute('age_birth_year', 'Birth year', false),
      attribute('age_over_18', 'Age over 18', false),
      attribute('age_over_21', 'Age over 21', false),
      attribute('issuing_jurisdiction', 'Issuing jurisdiction', false),
      attribute('nationality', 'Nationality', false),
      attribute('resident_city', 'City', false),
      attribute('resident_state', 'State', false),
      attribute('resident_postal_code', 'Postal code', false),
      attribute('resident_country', 'Country', false),
      attribute('family_name_national_character', 'Family name in national characters', false),
      attribute('given_name_national_character', 'Given name in national characters', false),
      attribute('signature_usual_mark', 'Signature or usual mark', false),
    ],
    presets: [
      { id: 'names', name: 'Names', attributes: ['given_name', 'family_name'] },
      { id: 'names-portrait', name: 'Names and portrait', attributes: ['given_name', 'family_name', 'portrait'] },
      { id: 'age-over-18', name: 'Age over 18', attributes: ['age_over_18'] },
      { id: 'age-over-21', name: 'Age over 21', attributes: ['age_over_21'] },
      {
        id: 'driving-privileges',
        name: 'Driving privileges',
        attributes: ['given_name', 'family_name', 'portrait', 'driving_privileges'],
      },
      { id: 'postal-code', name: 'Postal code', attributes: ['resident_postal_code'] },
    ],
  },
  {
    // EU Age Verification technical specification, Annex A (Proof of Age attestation profile)
    id: 'eudi-age',
    display: eudiAgeMdoc.display[0],
    formats: {
      mso_mdoc: { doctype: eudiAgeMdoc.doctype, namespace: eudiAgeMdoc.doctype },
    },
    attributes: [attribute('age_over_18', 'Age over 18', true), attribute('age_over_21', 'Age over 21', false)],
    presets: [
      { id: 'age-over-18', name: 'Age over 18', attributes: ['age_over_18'] },
      { id: 'age-over-21', name: 'Age over 21', attributes: ['age_over_21'] },
    ],
  },
  {
    // ISO/IEC DTS 23220-4 (draft of 2025-11-21), Annex C
    id: 'photo-id',
    display: photoIdMdoc.display[0],
    formats: {
      mso_mdoc: { doctype: photoIdMdoc.doctype, namespace: photoIdNamespace },
    },
    attributes: [
      // Table C.1, data elements defined by ISO/IEC TS 23220-2
      attribute('family_name', 'Family name', true),
      attribute('given_name', 'Given name', true),
      attribute('birth_date', 'Birth date', true),
      attribute('portrait', 'Portrait', true),
      attribute('issue_date', 'Issue date', true),
      attribute('expiry_date', 'Expiry date', true),
      attribute('issuing_authority', 'Issuing authority', true),
      attribute('issuing_country', 'Issuing country', true),
      attribute('age_over_18', 'Age over 18', true),
      attribute('age_over_21', 'Age over 21', false),
      attribute('age_in_years', 'Age in years', false),
      attribute('age_birth_year', 'Birth year', false),
      attribute('family_name_viz', 'Family name (visual inspection zone)', false),
      attribute('given_name_viz', 'Given name (visual inspection zone)', false),
      attribute('family_name_latin1', 'Family name (Latin-1)', false),
      attribute('given_name_latin1', 'Given name (Latin-1)', false),
      attribute('enrolment_portrait_image', 'Enrolment portrait', false),
      attribute('portrait_capture_date', 'Portrait capture date', false),
      attribute('birthplace', 'Place of birth', false),
      attribute('name_at_birth', 'Name at birth', false),
      attribute('resident_address', 'Address', false),
      attribute('resident_city', 'City', false),
      attribute('resident_city_latin1', 'City (Latin-1)', false),
      attribute('resident_postal_code', 'Postal code', false),
      attribute('resident_country', 'Country', false),
      attribute('sex', 'Sex', false),
      attribute('nationality', 'Nationality', false),
      attribute('document_number', 'Document number', false),
      attribute('issuing_subdivision', 'Issuing subdivision', false),

      // Table C.2, data elements specifically defined for the photo ID
      namespacedAttribute(photoIdSpecificNamespace, 'person_id', 'Person ID', false),
      namespacedAttribute(photoIdSpecificNamespace, 'birth_country', 'Birth country', false),
      namespacedAttribute(photoIdSpecificNamespace, 'birth_state', 'Birth state', false),
      namespacedAttribute(photoIdSpecificNamespace, 'birth_city', 'Birth city', false),
      namespacedAttribute(photoIdSpecificNamespace, 'administrative_number', 'Administrative number', false),
      namespacedAttribute(photoIdSpecificNamespace, 'resident_street', 'Street', false),
      namespacedAttribute(photoIdSpecificNamespace, 'resident_house_number', 'House number', false),
      namespacedAttribute(photoIdSpecificNamespace, 'resident_state', 'State', false),
      namespacedAttribute(photoIdSpecificNamespace, 'travel_document_type', 'Travel document type', false),
      namespacedAttribute(photoIdSpecificNamespace, 'travel_document_number', 'Travel document number', false),
      namespacedAttribute(photoIdSpecificNamespace, 'travel_document_mrz', 'Travel document MRZ', false),

      // Table C.3, ICAO 9303 data groups
      namespacedAttribute(photoIdDataGroupsNamespace, 'version', 'Data groups version', false),
      namespacedAttribute(photoIdDataGroupsNamespace, 'dg1', 'DG1: MRZ data', false),
      namespacedAttribute(photoIdDataGroupsNamespace, 'dg2', 'DG2: Encoded face', false),
      namespacedAttribute(photoIdDataGroupsNamespace, 'dg3', 'DG3: Encoded fingers', false),
      namespacedAttribute(photoIdDataGroupsNamespace, 'dg4', 'DG4: Encoded eyes', false),
      namespacedAttribute(photoIdDataGroupsNamespace, 'dg5', 'DG5: Displayed portrait', false),
      namespacedAttribute(photoIdDataGroupsNamespace, 'dg6', 'DG6: Reserved', false),
      namespacedAttribute(photoIdDataGroupsNamespace, 'dg7', 'DG7: Displayed signature', false),
      namespacedAttribute(photoIdDataGroupsNamespace, 'dg8', 'DG8: Data features', false),
      namespacedAttribute(photoIdDataGroupsNamespace, 'dg9', 'DG9: Structure features', false),
      namespacedAttribute(photoIdDataGroupsNamespace, 'dg10', 'DG10: Substance features', false),
      namespacedAttribute(photoIdDataGroupsNamespace, 'dg11', 'DG11: Additional personal details', false),
      namespacedAttribute(photoIdDataGroupsNamespace, 'dg12', 'DG12: Additional document details', false),
      namespacedAttribute(photoIdDataGroupsNamespace, 'dg13', 'DG13: Optional details', false),
      namespacedAttribute(photoIdDataGroupsNamespace, 'dg14', 'DG14: Security options', false),
      namespacedAttribute(photoIdDataGroupsNamespace, 'dg15', 'DG15: Active authentication public key', false),
      namespacedAttribute(photoIdDataGroupsNamespace, 'dg16', 'DG16: Persons to notify', false),
      namespacedAttribute(photoIdDataGroupsNamespace, 'sod', 'Document security object', false),
    ],
    presets: [
      { id: 'names', name: 'Names', attributes: ['given_name', 'family_name'] },
      { id: 'names-portrait', name: 'Names and portrait', attributes: ['given_name', 'family_name', 'portrait'] },
      { id: 'age-over-18', name: 'Age over 18', attributes: ['age_over_18'] },
      { id: 'postal-code', name: 'Postal code', attributes: ['resident_postal_code'] },
      {
        id: 'address',
        name: 'Address',
        attributes: [
          'resident_street',
          'resident_house_number',
          'resident_postal_code',
          'resident_city',
          'resident_state',
          'resident_country',
        ],
      },
    ],
  },
  {
    id: 'mvrc',
    display: mvrcMdoc.display[0],
    formats: {
      mso_mdoc: { doctype: mvrcMdoc.doctype, namespace: 'org.iso.7367.1' },
    },
    attributes: [
      attribute('registration_number', 'Registration number', true),
      attribute('vehicle_identification_number', 'Vehicle identification number', true),
      attribute('vehicle_holder', 'Vehicle holder', true),
      attribute('basic_vehicle_info', 'Basic vehicle info', true),
      attribute('date_of_registration', 'Date of registration', true),
      attribute('document_number', 'Document number', true),
      attribute('issue_date', 'Issue date', true),
      attribute('expiry_date', 'Expiry date', true),
      attribute('issuing_country', 'Issuing country', true),
      attribute('issuing_authority_unicode', 'Issuing authority', true),
      attribute('date_of_first_registration', 'Date of first registration', false),
      attribute('mass_info', 'Mass info', false),
      attribute('trailer_mass_info', 'Trailer mass info', false),
      attribute('engine_info', 'Engine info', false),
      attribute('seating_info', 'Seating info', false),
      attribute('un_distinguishing_sign', 'UN distinguishing sign', false),
    ],
    presets: [
      {
        id: 'vehicle',
        name: 'Vehicle',
        attributes: ['registration_number', 'vehicle_identification_number', 'basic_vehicle_info'],
      },
      { id: 'holder', name: 'Vehicle holder', attributes: ['registration_number', 'vehicle_holder'] },
    ],
  },
  {
    id: 'wero-card',
    display: weroScaConfiguration.display[0],
    formats: {
      'dc+sd-jwt': { vcts: [weroScaConfiguration.vct] },
    },
    attributes: weroCardAttributes,
    presets: [weroPaymentDetailsPreset],
  },
  /**
   * The PaSO Wero card, requestable on its own.
   *
   * A separate entry rather than a second `vct` on the one above, because the two are different
   * credential types holding the same attributes: the TS 12 card and the PaSO card have their own
   * `vct` and their own — mutually incompatible — `credential_metadata_uri`. Requesting them
   * together would have a wallet answer with whichever it happened to hold.
   *
   * Worth having without a payment transaction attached: it is the only way to check that the card
   * itself was issued and matches, separately from whether a PaSO transaction can be authorized
   * with it.
   */
  {
    id: 'wero-card-paso',
    display: weroPasoConfiguration.display[0],
    formats: {
      'dc+sd-jwt': { vcts: [weroPasoConfiguration.vct] },
    },
    attributes: weroCardAttributes,
    presets: [weroPaymentDetailsPreset],
  },
]

function withDefaultPresets(credential: PresentationCredential): PresentationCredential {
  const presets = [
    { id: 'all', name: 'All', attributes: credential.attributes.map((a) => a.id) },
    {
      id: 'all-required',
      name: 'All required',
      attributes: credential.attributes.filter((a) => a.required).map((a) => a.id),
    },
    ...credential.presets,
  ]

  // Drop presets that are empty or request the same attributes as an earlier preset
  // (e.g. 'All required' when all attributes are required)
  const uniquePresets = presets.filter(
    (preset, index) =>
      preset.attributes.length > 0 &&
      presets.findIndex((p) => [...p.attributes].sort().join() === [...preset.attributes].sort().join()) === index
  )

  return { ...credential, presets: uniquePresets }
}

export const presentationCredentials = presentationCredentialDefinitions.map(withDefaultPresets)
