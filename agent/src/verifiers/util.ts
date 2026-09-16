import type { DcqlQuery, MdocDcApiDocRequest } from '@credo-ts/core'
import { type PresentationCredentialFormat, presentationCredentials } from './credentials.js'

export interface SdJwtCredential {
  format: 'dc+sd-jwt'
  vcts: string[]
  issuers?: string[]
  fields: Array<string | { path: string; values: Array<string | number | boolean> }>
  field_options?: string[][]
}

export interface MdocCredential {
  format: 'mso_mdoc'
  doctype: string

  /**
   * Namespace of the fields, unless a field defines its own namespace.
   */
  namespace: string
  fields: Array<string | { path: string; namespace?: string; values?: Array<string | number | boolean> }>
  field_options?: string[][]
}

export interface W3cVcV1Credential {
  format: 'jwt_vc_json' | 'ldp_vc'
  type_values: string[][]
  fields: Array<string | { path: string; values: Array<string | number | boolean> }>
  field_options?: string[][]
}

export interface W3cVcV2Credential {
  format: 'vc+sd-jwt'
  type_values: string[][]
  fields: Array<string | { path: string; values: Array<string | number | boolean> }>
  field_options?: string[][]
}

export interface PresentationRequest {
  name: string
  purpose: string
  credentials: Array<SdJwtCredential | MdocCredential | W3cVcV1Credential | W3cVcV2Credential>
  // Indexes
  credential_sets?: Array<number[]>
}

export interface PresentationCredentialSelection {
  credentials: Array<{
    id: string
    formats: PresentationCredentialFormat[]
    attributes: string[]
  }>

  /**
   * `all` requires every selected credential to be presented (AND), `any` requires
   * one of the selected credentials to be presented (OR).
   */
  combination: 'all' | 'any'
}

/**
 * Creates a presentation request from credentials selected in the playground. The formats selected
 * for a credential are always alternatives of each other, as a credential only has to be presented once.
 */
export function presentationRequestFromSelection(selection: PresentationCredentialSelection): PresentationRequest {
  const credentials: PresentationRequest['credentials'] = []
  const credentialIndexesPerSelection: number[][] = []

  for (const selectedCredential of selection.credentials) {
    const credential = presentationCredentials.find((c) => c.id === selectedCredential.id)
    if (!credential) {
      throw new Error(`Unknown credential '${selectedCredential.id}'`)
    }

    const attributes = credential.attributes.filter((a) => selectedCredential.attributes.includes(a.id))
    const indexes: number[] = []

    for (const format of selectedCredential.formats) {
      const fields =
        format === 'dc+sd-jwt'
          ? attributes.flatMap((a) => a.sdJwt ?? [])
          : attributes.flatMap((a) =>
              a.mdoc ? [a.mdocNamespace ? { path: a.mdoc, namespace: a.mdocNamespace } : a.mdoc] : []
            )
      if (fields.length === 0) {
        throw new Error(
          `None of the selected attributes of credential '${credential.display.name}' are available in format '${format}'`
        )
      }

      const sdJwtFormat = credential.formats['dc+sd-jwt']
      const mdocFormat = credential.formats.mso_mdoc

      indexes.push(credentials.length)
      if (format === 'dc+sd-jwt' && sdJwtFormat) {
        credentials.push({
          format,
          vcts: sdJwtFormat.vcts,
          fields: fields.map((f) => (typeof f === 'string' ? f : f.path)),
        })
      } else if (format === 'mso_mdoc' && mdocFormat) {
        credentials.push({ format, doctype: mdocFormat.doctype, namespace: mdocFormat.namespace, fields })
      } else {
        throw new Error(`Credential '${credential.display.name}' is not available in format '${format}'`)
      }
    }

    credentialIndexesPerSelection.push(indexes)
  }

  const credentialNames = selection.credentials.map(
    (selectedCredential) => presentationCredentials.find((c) => c.id === selectedCredential.id)?.display.name
  )
  const credentialNamesText =
    credentialNames.length > 1
      ? `${credentialNames.slice(0, -1).join(', ')} ${selection.combination === 'all' ? 'and' : 'or'} ${credentialNames[credentialNames.length - 1]}`
      : credentialNames[0]

  return {
    name: credentialNamesText ?? 'Credentials',
    purpose: `Please share your ${credentialNamesText}`,
    credentials,
    credential_sets:
      selection.combination === 'all' ? credentialIndexesPerSelection : [credentialIndexesPerSelection.flat()],
  }
}

export function pidMdocCredential({ fields, field_options }: Pick<MdocCredential, 'fields' | 'field_options'>) {
  return {
    format: 'mso_mdoc',
    fields,
    doctype: 'eu.europa.ec.eudi.pid.1',
    namespace: 'eu.europa.ec.eudi.pid.1',
    field_options,
  } satisfies MdocCredential
}

export function pidSdJwtCredential({ fields }: Pick<SdJwtCredential, 'fields'>) {
  return {
    format: 'dc+sd-jwt',
    fields,
    vcts: ['urn:eudi:pid:1', 'https://demo.pid-issuer.bundesdruckerei.de/credentials/pid/1.0'],
  } satisfies SdJwtCredential
}

/**
 * Fields of an mdoc credential as `DocRequest` name spaces. A `DeviceRequest` can't express
 * alternative claim sets, so when `field_options` are defined we request the first option.
 * Value constraints (`{ path, values }`) can't be expressed either and are dropped.
 */
function isoMdocNameSpacesFromCredential(credential: MdocCredential): MdocDcApiDocRequest['nameSpaces'] {
  const fields = credential.field_options?.[0] ?? credential.fields
  const nameSpaces: MdocDcApiDocRequest['nameSpaces'] = {}

  for (const field of fields) {
    const { namespace, path } = mdocField(credential, field)
    nameSpaces[namespace] = { ...nameSpaces[namespace], [path]: false }
  }

  return nameSpaces
}

/**
 * Namespace and data element identifier of an mdoc field. The claim id includes the namespace
 * for fields outside the default namespace, as the same identifier can occur in multiple namespaces.
 */
function mdocField(credential: MdocCredential, field: MdocCredential['fields'][number]) {
  const namespace = typeof field === 'string' ? credential.namespace : (field.namespace ?? credential.namespace)
  const path = typeof field === 'string' ? field : field.path
  const id = (namespace === credential.namespace ? path : `${namespace}.${path}`).replaceAll('.', '_')

  return { namespace, path, id, values: typeof field === 'string' ? undefined : field.values }
}

/**
 * The ISO 18013-7 Annex C `DeviceRequest` only carries mdoc doc types and name spaces. When it has
 * more than one `DocRequest` it does not say whether all of them, or any one of them, is requested.
 * Both the verifier and the wallet have to opt in to treating them as alternatives
 * (`treatAmbiguousMultipleDocRequestsAsAlternatives`), which we do for a request with a single
 * credential set (the `any` combination). Otherwise every `DocRequest` is requested.
 *
 * A request can therefore only be expressed as a `DeviceRequest` if every credential set has at least
 * one mdoc option (or, when no credential sets are defined, if all credentials are mdoc).
 *
 * Returns `undefined` if the request can't be expressed as a `DeviceRequest`.
 */
export function isoMdocDocRequestsFromRequest(
  request: PresentationRequest
): { docRequests: MdocDcApiDocRequest[]; docRequestsAsAlternatives: boolean } | undefined {
  const mdocCredentials = (indexes: number[]) =>
    indexes.map((index) => request.credentials[index]).filter((c): c is MdocCredential => c?.format === 'mso_mdoc')

  // A single credential set is a list of alternatives, which maps to doc requests as alternatives.
  // Every mdoc option becomes its own doc request, as merging options of the same doc type would
  // require the claims of all of them.
  if (request.credential_sets?.length === 1) {
    const docRequests = mdocCredentials(request.credential_sets[0]).map((credential) => ({
      docType: credential.doctype,
      nameSpaces: isoMdocNameSpacesFromCredential(credential),
    }))
    if (docRequests.length === 0) return undefined

    return { docRequests, docRequestsAsAlternatives: docRequests.length > 1 }
  }

  // With multiple credential sets, all sets are required but each set is a list of alternatives. A
  // DeviceRequest can't express alternatives within required doc requests, so we pick the first mdoc
  // option of each set. Without credential sets all credentials are requested, so all must be mdoc.
  const credentials = request.credential_sets
    ? request.credential_sets.map((set) => mdocCredentials(set)[0])
    : request.credentials.map((c) => (c.format === 'mso_mdoc' ? c : undefined))

  if (credentials.some((c) => c === undefined)) return undefined

  const docRequests: MdocDcApiDocRequest[] = []
  for (const credential of credentials as MdocCredential[]) {
    // Two sets can resolve to the same doc type, and a DeviceRequest should request each doc type once.
    const existing = docRequests.find((docRequest) => docRequest.docType === credential.doctype)
    const nameSpaces = isoMdocNameSpacesFromCredential(credential)

    if (existing) {
      for (const [namespace, elements] of Object.entries(nameSpaces)) {
        existing.nameSpaces[namespace] = { ...existing.nameSpaces[namespace], ...elements }
      }
    } else {
      docRequests.push({ docType: credential.doctype, nameSpaces })
    }
  }

  return { docRequests, docRequestsAsAlternatives: false }
}

export function dcqlQueryFromRequest(request: PresentationRequest, purpose?: string): DcqlQuery {
  return {
    credentials: request.credentials.map((c, credentialIndex): DcqlQuery['credentials'][number] => {
      if (c.format === 'dc+sd-jwt') {
        return {
          id: `${credentialIndex}`,
          format: c.format,
          meta: {
            vct_values: c.vcts,
          },
          claims: [
            ...c.fields.map((f) =>
              typeof f === 'string'
                ? { path: f.split('.'), id: f.replace('.', '_') }
                : { path: f.path.split('.'), id: f.path.replace('.', '_'), values: f.values }
            ),
            ...(c.issuers?.length
              ? [
                  {
                    id: 'iss',
                    path: ['iss'],
                    values: c.issuers,
                  },
                ]
              : []),
          ],
          claim_sets: c.field_options?.map((o) => {
            const oo = o.map((oo) => oo.replaceAll('.', '_'))
            return c.issuers?.length ? [...oo, 'iss'] : oo
          }),
        }
      }

      if (c.format === 'mso_mdoc') {
        return {
          id: `${credentialIndex}`,
          format: c.format,
          meta: {
            doctype_value: c.doctype,
          },
          claims: c.fields.map((f) => {
            const { namespace, path, id, values } = mdocField(c, f)
            return { id, path: [namespace, path], intent_to_retain: false, ...(values ? { values } : {}) }
          }),
          claim_sets: c.field_options?.map((o) => o.map((oo) => oo.replaceAll('.', '_'))),
        }
      }

      return {
        id: `${credentialIndex}`,
        format: c.format,
        meta: {
          type_values: c.type_values,
        },
        claims: c.fields.map((f) =>
          typeof f === 'string'
            ? { path: f.split('.'), id: f.replaceAll('.', '_') }
            : { path: f.path.split('.'), id: f.path.replaceAll('.', '_'), values: f.values }
        ),
        claim_sets: c.field_options?.map((o) => o.map((oo) => oo.replaceAll('.', '_'))),
      }
    }),
    credential_sets: request.credential_sets
      ? request.credential_sets.map((set) => ({
          options: set.map((v) => [`${v}`]),
          purpose: purpose ?? request.purpose,
        }))
      : [
          {
            options: [request.credentials.map((_, index) => `${index}`)],
            purpose: purpose ?? request.purpose,
          },
        ],
  }
}
