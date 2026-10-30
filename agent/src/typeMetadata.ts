import { readFileSync } from 'node:fs'
import type { SdJwtConfiguration } from './issuer.js'
import { issuers } from './issuers/index.js'
import { weroPasoConfiguration } from './issuers/openHorizonBank.js'
import { computeSriIntegrity } from './paso/metadata.js'
import { getVctUrl } from './utils/getVctUrl.js'

/**
 * Where this agent serves the WPA type metadata. Its publisher doesn't serve it yet
 * (`wero.epicompany.eu` doesn't answer), and a type that extends it can only be resolved with it, so
 * resolvers map the WPA `vct` here for now. The `extends#integrity` of a type extending it pins this
 * document, so it changes to the publisher's hash once they serve one.
 */
export const weroPaymentAttestationTypeMetadataPath = '/vct/wero/payment_attestation/v1'

/**
 * Type metadata names a claim's label `label` where OID4VCI says `name`, and requires a locale, so an
 * untagged entry becomes English. With SVG templates, a claim of string path segments gets the
 * `svg_id` those segments joined by `_`, which is what a template uses as its placeholder.
 */
const toTypeMetadataClaims = (claims: SdJwtConfiguration['credential_metadata']['claims'], withSvgIds = false) =>
  (claims ?? []).map(({ path, display }) => {
    const svgId = path.join('_')
    return {
      path,
      display: display?.map(({ name, locale }) => ({ locale: locale ?? 'en', label: name })),
      svg_id: withSvgIds && /^[A-Za-z_][A-Za-z0-9_]*$/.test(svgId) ? svgId : undefined,
    }
  })

export const weroPaymentAttestationTypeMetadata = {
  vct: weroPasoConfiguration.vct,
  name: 'Wero Payment Attestation',
  description: 'Proof of a payment account, used as the possession factor of Strong Customer Authentication.',
  claims: toTypeMetadataClaims(weroPasoConfiguration.credential_metadata.claims),
}

/**
 * A type metadata document as this agent serves it. `extends#integrity` and the resolver's
 * `vct#integrity` checks hash this, so the endpoints send exactly this string.
 */
export const serializeTypeMetadata = (typeMetadata: object) => JSON.stringify(typeMetadata)

/** The integrity of a type metadata document this agent publishes, `undefined` for any other `vct`. */
function getPublishedTypeMetadataIntegrity(vct: string): string | undefined {
  const typeMetadata = getPublishedTypeMetadata(vct)
  return typeMetadata && computeSriIntegrity(serializeTypeMetadata(typeMetadata))
}

/** An issuer's SD-JWT VC configuration whose `vct` is made with `getVctUrl`. */
function findTypeMetadataEntry(issuerId: string, configurationId: string) {
  const issuer = issuers.find((issuer) => issuer.issuerId === issuerId)
  const entry = issuer?.credentialConfigurationsSupported
    .map((formats) => formats['dc+sd-jwt'])
    .find((entry) => entry?.data.credentialConfigurationId === configurationId)
  const vct = getVctUrl(issuerId, configurationId)
  if (!issuer || !entry || entry.configuration.vct !== vct) return undefined
  return { issuer, entry, vct }
}

const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (character) => `&#${character.charCodeAt(0)};`)

/**
 * The SVG template of an issuer's type for one display locale, with the card name of that locale.
 * `undefined` when the type has no template or no display in that locale.
 */
export function renderSvgTemplate(issuerId: string, configurationId: string, locale: string) {
  const found = findTypeMetadataEntry(issuerId, configurationId)
  const file = found?.entry.typeMetadata?.svgTemplate
  const display = found?.entry.configuration.credential_metadata.display.find(
    (display) => (display.locale ?? 'en') === locale
  )
  if (!file || !display) return undefined

  return readFileSync(`${import.meta.dirname}/../assets/${file}`, 'utf8').replaceAll(
    '{{credential_name}}',
    escapeXml(display.name)
  )
}

/**
 * The type metadata of an issuer's SD-JWT VC whose `vct` is made with `getVctUrl`, built from its
 * credential configuration. `undefined` for any other configuration.
 */
export function getIssuerTypeMetadata(issuerId: string, configurationId: string) {
  const found = findTypeMetadataEntry(issuerId, configurationId)
  if (!found) return undefined

  const { issuer, entry, vct } = found
  const { display, claims } = entry.configuration.credential_metadata
  const { extends: extendsVct, svgTemplate } = entry.typeMetadata ?? {}
  return {
    vct,
    name: `${issuer.display[0].name} ${display[0].name}`,
    extends: extendsVct,
    'extends#integrity': extendsVct && getPublishedTypeMetadataIntegrity(extendsVct),
    display: display.map(
      ({ locale = 'en', name, description, background_color, text_color, background_image, logo }) => {
        const svg = svgTemplate && renderSvgTemplate(issuerId, configurationId, locale)
        return {
          locale,
          name,
          description,
          rendering: {
            simple: {
              background_color,
              text_color,
              logo: logo && { uri: logo.uri, alt_text: logo.alt_text },
              background_image: background_image && { uri: background_image.uri },
            },
            svg_templates: svg && [{ uri: `${vct}/svg/${locale}`, 'uri#integrity': computeSriIntegrity(svg) }],
          },
        }
      }
    ),
    claims: toTypeMetadataClaims(claims, svgTemplate !== undefined),
  }
}

/**
 * The type metadata this agent serves for a `vct`, resolved without a request: it is this agent's
 * own, and it then resolves on a local `http://` host too. `undefined` for any other `vct`.
 */
export function getPublishedTypeMetadata(vct: string) {
  if (vct === weroPaymentAttestationTypeMetadata.vct) return weroPaymentAttestationTypeMetadata

  for (const { issuerId, credentialConfigurationsSupported } of issuers) {
    for (const formats of credentialConfigurationsSupported) {
      const configurationId = formats['dc+sd-jwt']?.data.credentialConfigurationId
      if (configurationId && getVctUrl(issuerId, configurationId) === vct) {
        return getIssuerTypeMetadata(issuerId, configurationId)
      }
    }
  }
  return undefined
}
