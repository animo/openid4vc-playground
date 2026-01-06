import type { DcqlQuery } from '@credo-ts/core'
import type { PlaygroundVerifierOptions } from '../verifier.js'

export interface SdJwtCredential {
  format: 'dc+sd-jwt'
  vcts: string[]
  issuers?: string[]
  fields: Array<string | { path: string; values: Array<string | number | boolean> }>

  // aka claim sets. Only used for DCQL
  field_options?: string[][]
}

export interface MdocCredential {
  format: 'mso_mdoc'
  doctype: string
  namespace: string
  fields: Array<string | { path: string; values: Array<string | number | boolean> }>

  // aka claim sets. Only used for DCQL
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

export function dcqlQueryFromRequest(
  request: PlaygroundVerifierOptions['requests'][number],
  purpose?: string
): DcqlQuery {
  return {
    credentials: request.credentials.map((c, credentialIndex): DcqlQuery['credentials'][number] =>
      c.format === 'dc+sd-jwt'
        ? {
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
              const oo = o.map((oo) => oo.replace('.', '_'))
              return c.issuers?.length ? [...oo, 'iss'] : oo
            }),
          }
        : {
            id: `${credentialIndex}`,
            format: c.format,
            meta: {
              doctype_value: c.doctype,
            },
            claims: c.fields.map((f) =>
              typeof f === 'string'
                ? { id: f.replace('.', '_'), path: [c.namespace, f], intent_to_retain: false }
                : {
                    id: f.path.replace('.', '_'),
                    path: [c.namespace, f.path],
                    intent_to_retain: false,
                    values: f.values,
                  }
            ),
            claim_sets: c.field_options?.map((o) => o.map((oo) => oo.replace('.', '_'))),
          }
    ),
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
