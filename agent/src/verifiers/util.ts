import { randomUUID } from 'node:crypto'
import type { DcqlQuery, DifPresentationExchangeDefinitionV2 } from '@credo-ts/core'

export function sdJwtDcqlCredential({
  vcts,
  fields,
  issuers,
  id,
}: {
  vcts: string[]
  fields: string[]
  issuers?: string[]
  id?: string
}): DcqlQuery['credentials'][number] {
  return {
    id: id ?? randomUUID(),
    format: 'vc+sd-jwt',
    meta: {
      vct_values: vcts,
    },
    claims: [
      ...fields.map((field) => ({
        path: field.split('.'),
      })),
      issuers
        ? {
            path: ['iss'],
            values: issuers,
          }
        : undefined,
    ].filter((claim): claim is NonNullable<typeof claim> => claim !== undefined),
  }
}

export function sdJwtInputDescriptor({
  vcts,
  fields,
  issuers,
  id,
  group,
}: {
  vcts: string[]
  fields: string[]
  issuers?: string[]
  id?: string
  group?: string | string[]
}): DifPresentationExchangeDefinitionV2['input_descriptors'][number] {
  return {
    id: id ?? randomUUID(),
    format: {
      'vc+sd-jwt': {
        'sd-jwt_alg_values': ['ES256'],
        'kb-jwt_alg_values': ['ES256'],
      },
    },
    group: group ? (Array.isArray(group) ? group : [group]) : undefined,
    constraints: {
      limit_disclosure: 'required',
      fields: [
        ...fields.map((field) => ({
          path: [`$.${field}`],
        })),
        {
          path: ['$.vct'],
          filter: {
            type: 'string',
            enum: vcts,
          },
        },
        issuers
          ? {
              path: ['$.iss'],
              filter: {
                type: 'string',
                enum: issuers,
              },
            }
          : undefined,
      ].filter((f): f is Exclude<typeof f, undefined> => f !== undefined),
    },
  }
}

export function mdocDcqlCredential({
  doctype,
  namespace,
  fields,
}: {
  doctype: string
  namespace: string
  fields: [string, ...string[]]
}): DcqlQuery['credentials'][number] {
  return {
    id: randomUUID(),
    format: 'mso_mdoc',
    meta: {
      doctype_value: doctype,
    },
    claims: fields.map((field) => ({
      namespace,
      claim_name: field,
    })),
  }
}

export function mdocInputDescriptor({
  doctype,
  namespace,
  fields,
  group,
}: {
  doctype: string
  namespace: string
  fields: string[]
  group?: string | string[]
}): DifPresentationExchangeDefinitionV2['input_descriptors'][number] {
  return {
    id: doctype,
    format: {
      mso_mdoc: {
        alg: ['ES256'],
      },
    },
    group: group ? (Array.isArray(group) ? group : [group]) : undefined,
    constraints: {
      limit_disclosure: 'required',
      fields: [
        ...fields.map((field) => ({
          path: [`$['${namespace}']['${field}']`],
          intent_to_retain: false,
        })),
      ].filter((f): f is Exclude<typeof f, undefined> => f !== undefined),
    },
  }
}

export function pidMdocDcqlCredential({ fields }: { fields: [string, ...string[]] }) {
  return mdocDcqlCredential({
    fields,
    doctype: 'eu.europa.ec.eudi.pid.1',
    namespace: 'eu.europa.ec.eudi.pid.1',
  })
}

export function pidMdocInputDescriptor({ fields, group }: { fields: string[]; group?: string | string[] }) {
  return mdocInputDescriptor({
    fields,
    group,
    doctype: 'eu.europa.ec.eudi.pid.1',
    namespace: 'eu.europa.ec.eudi.pid.1',
  })
}

export function pidSdJwtDcqlCredential({ fields, id }: { fields: [string, ...string[]]; id?: string }) {
  return sdJwtDcqlCredential({
    id,
    fields,
    vcts: ['https://example.bmi.bund.de/credential/pid/1.0', 'urn:eu.europa.ec.eudi:pid:1'],
    issuers: [
      'https://demo.pid-issuer.bundesdruckerei.de/c',
      'https://demo.pid-issuer.bundesdruckerei.de/c1',
      'https://demo.pid-issuer.bundesdruckerei.de/b1',
    ],
  })
}

export function pidSdJwtInputDescriptor({
  fields,
  id,
  group,
}: { fields: string[]; id?: string; group?: string | string[] }) {
  return sdJwtInputDescriptor({
    id,
    group,
    fields,
    vcts: ['https://example.bmi.bund.de/credential/pid/1.0', 'urn:eu.europa.ec.eudi:pid:1'],
    issuers: [
      'https://demo.pid-issuer.bundesdruckerei.de/c',
      'https://demo.pid-issuer.bundesdruckerei.de/c1',
      'https://demo.pid-issuer.bundesdruckerei.de/b1',
    ],
  })
}
