import type { DcqlQuery, MdocDocumentRequest } from '@credo-ts/core'
import type { PlaygroundVerifierOptions } from '../verifier.js'

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
  namespace: string
  fields: Array<string | { path: string; values: Array<string | number | boolean> }>
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
function isoMdocNameSpacesFromCredential(credential: MdocCredential): MdocDocumentRequest['nameSpaces'] {
  const paths = credential.field_options?.[0] ?? credential.fields.map((f) => (typeof f === 'string' ? f : f.path))

  return {
    [credential.namespace]: Object.fromEntries(paths.map((path) => [path, false])),
  }
}

/**
 * The ISO 18013-7 Annex C `DeviceRequest` only carries mdoc doc types and name spaces, and has no
 * way to express optionality: every `DocRequest` in it is requested. A request can therefore only
 * be expressed as a `DeviceRequest` if every credential set has at least one mdoc option (or, when
 * no credential sets are defined, if all credentials are mdoc).
 *
 * Returns `undefined` if the request can't be expressed as a `DeviceRequest`.
 */
export function isoMdocDocRequestsFromRequest(
  request: PlaygroundVerifierOptions['requests'][number]
): MdocDocumentRequest[] | undefined {
  // Each credential set is a list of alternatives of which one must be satisfied. As a
  // DeviceRequest can't express alternatives we pick the first mdoc option of each set.
  // Without credential sets all credentials are requested, so all of them must be mdoc.
  const credentials = request.credential_sets
    ? request.credential_sets.map((set) =>
        set.map((index) => request.credentials[index]).find((c) => c?.format === 'mso_mdoc')
      )
    : request.credentials.map((c) => (c.format === 'mso_mdoc' ? c : undefined))

  if (credentials.some((c) => c === undefined)) return undefined

  const docRequests: MdocDocumentRequest[] = []
  for (const credential of credentials as MdocCredential[]) {
    // Two sets can resolve to the same doc type, and a DeviceRequest should request each doc type once.
    const existing = docRequests.find((docRequest) => docRequest.docType === credential.doctype)
    const nameSpaces = isoMdocNameSpacesFromCredential(credential)

    if (existing) {
      existing.nameSpaces[credential.namespace] = {
        ...existing.nameSpaces[credential.namespace],
        ...nameSpaces[credential.namespace],
      }
    } else {
      docRequests.push({ docType: credential.doctype, nameSpaces })
    }
  }

  return docRequests
}

export function dcqlQueryFromRequest(
  request: PlaygroundVerifierOptions['requests'][number],
  purpose?: string
): DcqlQuery {
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
          claims: c.fields.map((f) =>
            typeof f === 'string'
              ? { id: f.replaceAll('.', '_'), path: [c.namespace, f], intent_to_retain: false }
              : {
                  id: f.path.replaceAll('.', '_'),
                  path: [c.namespace, f.path],
                  intent_to_retain: false,
                  values: f.values,
                }
          ),
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
