import { randomUUID } from 'node:crypto'
import type { DifPresentationExchangeDefinitionV2 } from '@credo-ts/core'

export function sdJwtInputDescriptor({
  vcts,
  fields,
  issuers,
  id,
}: {
  vcts: string[]
  fields: string[]
  issuers?: string[]
  id?: string
}): DifPresentationExchangeDefinitionV2['input_descriptors'][number] {
  return {
    id: id ?? randomUUID(),
    format: {
      'vc+sd-jwt': {
        'sd-jwt_alg_values': ['ES256'],
        'kb-jwt_alg_values': ['ES256'],
      },
    },
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

export function mdocInputDescriptor({
  doctype,
  namespace,
  fields,
}: {
  doctype: string
  namespace: string
  fields: string[]
}): DifPresentationExchangeDefinitionV2['input_descriptors'][number] {
  return {
    id: doctype,
    format: {
      mso_mdoc: {
        alg: ['ES256'],
      },
    },
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

export function pidMdocInputDescriptor({ fields }: { fields: string[] }) {
  return mdocInputDescriptor({
    fields,
    doctype: 'eu.europa.ec.eudi.pid.1',
    namespace: 'eu.europa.ec.eudi.pid.1',
  })
}
export function pidSdJwtInputDescriptor({ fields, id }: { fields: string[]; id?: string }) {
  return sdJwtInputDescriptor({
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
