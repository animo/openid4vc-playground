import { randomUUID } from 'crypto'
import type { DcqlQuery, DifPresentationExchangeDefinitionV2 } from '@credo-ts/core'
import type { PlaygroundVerifierOptions } from '../verifier'

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
    vcts: ['https://demo.pid-issuer.bundesdruckerei.de/credentials/pid/1.0'],
    issuers: [
      'https://demo.pid-issuer.bundesdruckerei.de/c',
      'https://demo.pid-issuer.bundesdruckerei.de/c1',
      'https://demo.pid-issuer.bundesdruckerei.de/b1',
    ],
  } satisfies SdJwtCredential
}

export function presentationDefinitionFromRequest(
  request: PlaygroundVerifierOptions['requests'][number],
  purpose?: string
): DifPresentationExchangeDefinitionV2 {
  return {
    id: randomUUID(),
    name: request.name,
    purpose: purpose ?? request.purpose,
    input_descriptors: request.credentials.map((c, index) => ({
      id: c.format === 'mso_mdoc' ? c.doctype : randomUUID(),
      group: request.credential_sets
        ?.map((set, setIndex) => (set.includes(index) ? `${setIndex}` : undefined))
        .filter((s): s is string => s !== undefined),
      format:
        c.format === 'dc+sd-jwt'
          ? {
              'vc+sd-jwt': {
                'sd-jwt_alg_values': ['ES256', 'ES384', 'EdDSA'],
                'kb-jwt_alg_values': ['ES256', 'ES384', 'EdDSA'],
              },
            }
          : {
              mso_mdoc: {
                alg: ['ES256', 'ES384', 'EdDSA'],
              },
            },
      constraints: {
        limit_disclosure: 'required',
        fields: [
          ...c.fields.map((field) =>
            c.format === 'dc+sd-jwt'
              ? {
                  path: [`$.${typeof field === 'string' ? field : field.path}`],
                  filter:
                    typeof field !== 'string'
                      ? {
                          enum: field.values,
                        }
                      : undefined,
                }
              : {
                  intent_to_retain: false,
                  path: [`$['${c.namespace}']['${typeof field === 'string' ? field : field.path}']`],
                  // Filter not allowed for mdoc
                }
          ),
          ...(c.format === 'dc+sd-jwt' && c.issuers?.length
            ? [
                {
                  path: ['$.iss'],
                  filter: {
                    type: 'string',
                    enum: c.issuers,
                  },
                },
              ]
            : []),
          ...(c.format === 'dc+sd-jwt' && c.vcts.length
            ? [
                {
                  path: ['$.vct'],
                  filter: {
                    type: 'string',
                    enum: c.vcts,
                  },
                },
              ]
            : []),
        ],
      },
    })),
    submission_requirements: request.credential_sets?.map((_, index) => ({
      rule: 'pick',
      count: 1,
      from: `${index}`,
    })),
  }
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
