import { randomUUID } from 'crypto'
import type { DcqlQuery, DifPresentationExchangeDefinitionV2 } from '@credo-ts/core'
import type { PlaygroundVerifierOptions } from '../verifier'

export interface SdJwtCredential {
  format: 'dc+sd-jwt'
  vcts: string[]
  issuers?: string[]
  fields: [string, ...string[]]
}

export interface MdocCredential {
  format: 'mso_mdoc'
  doctype: string
  namespace: string
  fields: [string, ...string[]]
}

export function pidMdocCredential({ fields }: Pick<MdocCredential, 'fields'>) {
  return {
    format: 'mso_mdoc',
    fields,
    doctype: 'eu.europa.ec.eudi.pid.1',
    namespace: 'eu.europa.ec.eudi.pid.1',
  } satisfies MdocCredential
}

export function pidSdJwtCredential({ fields }: Pick<SdJwtCredential, 'fields'>) {
  return {
    format: 'dc+sd-jwt',
    fields,
    vcts: ['https://demo.pid-issuer.bundesdruckerei.de/credentials/pid/1.0', 'urn:eu.europa.ec.eudi:pid:1'],
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
                  path: [`$.${field}`],
                }
              : {
                  intent_to_retain: false,
                  path: [`$['${c.namespace}']['${field}']`],
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
    submission_requirements: request.credential_sets?.map((index) => ({
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
              ...c.fields.map((f) => ({ path: f.split('.') })),
              ...(c.issuers?.length
                ? [
                    {
                      path: ['iss'],
                      values: c.issuers,
                    },
                  ]
                : []),
            ],
          }
        : {
            id: `${credentialIndex}`,
            format: c.format,
            meta: {
              doctype_value: c.doctype,
            },
            claims: c.fields.map((f) => ({ path: [c.doctype, f], intent_to_retain: false })),
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
