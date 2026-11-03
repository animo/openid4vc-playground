import { Cross2Icon } from '@radix-ui/react-icons'
import { useState } from 'react'
import type { PresentationCredential, PresentationCredentialFormat, PresentationCredentialSelection } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Field } from './Field'
import { Button } from './ui/button'
import { CredentialCardCheckboxItem, MiniCheckboxItem } from './ui/checkbox'
import { Input } from './ui/input'
import { MiniRadioItem, RadioGroup } from './ui/radio'

type SelectedCredential = PresentationCredentialSelection['credentials'][number]

const formatLabels: Record<PresentationCredentialFormat, string> = {
  'dc+sd-jwt': 'SD-JWT VC',
  mso_mdoc: 'mDOC',
}

const isSameAttributeSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id))

/**
 * Selects all formats of the credential, and the first preset specific to the credential (falling
 * back to all attributes if the credential has no specific presets).
 */
export function getDefaultCredentialSelection(credential: PresentationCredential): SelectedCredential {
  const preset =
    credential.presets.find((preset) => preset.id !== 'all' && preset.id !== 'all-required') ?? credential.presets[0]

  return {
    id: credential.id,
    formats: credential.formats,
    attributes: preset?.attributes ?? credential.attributes.map((attribute) => attribute.id),
  }
}

/**
 * The ISO 18013-7 Annex C DeviceRequest only carries mdoc doc requests, so for an AND request all credentials
 * need to be requested as mdoc, and for an OR request at least one of them (the mdoc credentials are requested
 * as alternatives).
 */
export function selectionSupportsIsoMdoc(selection: PresentationCredentialSelection) {
  const hasMdoc = (credential: SelectedCredential) => credential.formats.includes('mso_mdoc')

  return selection.combination === 'all'
    ? selection.credentials.length > 0 && selection.credentials.every(hasMdoc)
    : selection.credentials.some(hasMdoc)
}

export function getCredentialSelectionError(
  credentials: PresentationCredential[],
  selection: PresentationCredentialSelection
) {
  if (selection.credentials.length === 0) return 'Select at least one credential to request'

  for (const selectedCredential of selection.credentials) {
    const credential = credentials.find((c) => c.id === selectedCredential.id)
    if (!credential) continue

    if (selectedCredential.attributes.length === 0) {
      return `Select at least one attribute to request from the ${credential.display.name}`
    }

    for (const format of selectedCredential.formats) {
      const hasAttributeInFormat = credential.attributes.some(
        (attribute) => selectedCredential.attributes.includes(attribute.id) && attribute.formats.includes(format)
      )
      if (!hasAttributeInFormat) {
        return `None of the selected attributes of the ${credential.display.name} are available in ${formatLabels[format]}`
      }
    }
  }

  return undefined
}

/** The credentials as cards, where credentials with the same name are variants of one card. */
function getCredentialCards(credentials: PresentationCredential[]) {
  const cards: PresentationCredential[][] = []
  for (const credential of credentials) {
    const card = cards.find(([first]) => first.display.name === credential.display.name)
    if (card) card.push(credential)
    else cards.push([credential])
  }
  return cards
}

export function CredentialRequestBuilder({
  credentials,
  selection,
  onSelectionChange,
  paymentAmount,
  onPaymentAmountChange,
}: {
  credentials: PresentationCredential[]
  selection: PresentationCredentialSelection
  onSelectionChange: (selection: PresentationCredentialSelection) => void
  paymentAmount: string
  onPaymentAmountChange: (paymentAmount: string) => void
}) {
  const toggleCredential = (credential: PresentationCredential, checked: boolean) =>
    onSelectionChange({
      ...selection,
      credentials: checked
        ? [...selection.credentials, getDefaultCredentialSelection(credential)]
        : selection.credentials.filter((c) => c.id !== credential.id),
    })

  const replaceCredential = (id: string, credential: PresentationCredential) =>
    onSelectionChange({
      ...selection,
      credentials: selection.credentials.map((c) => (c.id === id ? getDefaultCredentialSelection(credential) : c)),
    })

  const cards = getCredentialCards(credentials)

  const updateCredential = (updated: SelectedCredential) =>
    onSelectionChange({
      ...selection,
      credentials: selection.credentials.map((c) => (c.id === updated.id ? updated : c)),
    })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <h4 className="font-medium text-gray-900 text-sm">Credentials</h4>
          <p className="text-gray-500 text-sm">Select one or more credentials to request from the wallet.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {cards.map((variants) => {
            // The card shows the selected variant
            const selected = variants.find((variant) => selection.credentials.some((c) => c.id === variant.id))
            const { display } = selected ?? variants[0]
            const formats = new Set(variants.flatMap((variant) => variant.formats))

            return (
              <CredentialCardCheckboxItem
                key={variants[0].id}
                checked={selected !== undefined}
                onCheckedChange={(checked) => toggleCredential(selected ?? variants[0], checked)}
                credential={{
                  name: display.name,
                  background_color: display.background_color,
                  background_image: display.background_image?.uri,
                  text_color: display.text_color,
                }}
                tags={[
                  ...variants.flatMap((variant) => variant.variant ?? []),
                  ...[...formats].map((format) => formatLabels[format]),
                ]}
              />
            )
          })}
        </div>
      </div>

      {selection.credentials.length > 1 && (
        <Field
          label="Combination"
          description="Whether the wallet has to present all selected credentials, or only one of them."
        >
          <RadioGroup
            name="combination"
            className="gap-x-5 gap-y-2"
            value={selection.combination}
            onValueChange={(combination) =>
              onSelectionChange({
                ...selection,
                combination: combination as PresentationCredentialSelection['combination'],
              })
            }
          >
            <MiniRadioItem value="all" label="All credentials (AND)" />
            <MiniRadioItem value="any" label="One of the credentials (OR)" />
          </RadioGroup>
        </Field>
      )}

      {selection.credentials.map((selectedCredential) => {
        const credential = credentials.find((c) => c.id === selectedCredential.id)
        if (!credential) return null

        return (
          <SelectedCredentialConfiguration
            key={credential.id}
            credential={credential}
            variants={cards.find((card) => card.includes(credential)) ?? [credential]}
            selectedCredential={selectedCredential}
            onVariantChange={(variant) => replaceCredential(credential.id, variant)}
            paymentAmount={paymentAmount}
            onPaymentAmountChange={onPaymentAmountChange}
            onChange={updateCredential}
            onRemove={() => toggleCredential(credential, false)}
          />
        )
      })}
    </div>
  )
}

function SelectedCredentialConfiguration({
  credential,
  variants,
  selectedCredential,
  onVariantChange,
  paymentAmount,
  onPaymentAmountChange,
  onChange,
  onRemove,
}: {
  credential: PresentationCredential
  variants: PresentationCredential[]
  selectedCredential: SelectedCredential
  onVariantChange: (variant: PresentationCredential) => void
  paymentAmount: string
  onPaymentAmountChange: (paymentAmount: string) => void
  onChange: (selectedCredential: SelectedCredential) => void
  onRemove: () => void
}) {
  const [isEditingAttributes, setIsEditingAttributes] = useState(false)
  // Once the attributes are edited by hand we keep showing 'Custom', even if the selection happens to match a preset
  const [isCustom, setIsCustom] = useState(false)

  const matchingPreset = credential.presets.find((preset) =>
    isSameAttributeSet(preset.attributes, selectedCredential.attributes)
  )
  const selectedPresetId = isCustom || !matchingPreset ? 'custom' : matchingPreset.id

  const toggleFormat = (format: PresentationCredentialFormat, checked: boolean) =>
    onChange({
      ...selectedCredential,
      // Keep the order of the formats of the credential
      formats: credential.formats.filter((f) => (f === format ? checked : selectedCredential.formats.includes(f))),
    })

  const toggleAttribute = (attributeId: string, checked: boolean) => {
    setIsCustom(true)
    onChange({
      ...selectedCredential,
      attributes: credential.attributes
        .map((attribute) => attribute.id)
        .filter((id) => (id === attributeId ? checked : selectedCredential.attributes.includes(id))),
    })
  }

  return (
    <div className="space-y-5 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-12 rounded-md shrink-0"
            style={{
              backgroundColor: credential.display.background_color,
              backgroundImage: credential.display.background_image
                ? `url(${credential.display.background_image.uri})`
                : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <span className="font-medium">{credential.display.name}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={`Remove ${credential.display.name}`}
        >
          <Cross2Icon className="h-4 w-4" />
        </Button>
      </div>

      {variants.length > 1 && (
        <Field label="Specification" description="The specification the credential is requested under.">
          <RadioGroup
            className="gap-x-5 gap-y-2"
            value={credential.id}
            onValueChange={(id) => {
              const variant = variants.find((v) => v.id === id)
              if (variant) onVariantChange(variant)
            }}
          >
            {variants.map((variant) => (
              <MiniRadioItem key={variant.id} value={variant.id} label={variant.variant ?? variant.display.name} />
            ))}
          </RadioGroup>
        </Field>
      )}

      {credential.transactionAuthorization && (
        <Field
          label="Amount (EUR)"
          description="The payment the wallet asks to authorize with this credential."
          htmlFor={`${credential.id}-amount`}
        >
          <Input
            id={`${credential.id}-amount`}
            inputMode="decimal"
            className="max-w-48"
            value={paymentAmount}
            onChange={({ target }) => onPaymentAmountChange(target.value)}
          />
        </Field>
      )}

      {credential.formats.length > 1 && (
        <Field
          label="Format"
          description="When multiple formats are selected, the wallet can present the credential in either format."
        >
          <div className="flex flex-row gap-x-5">
            {credential.formats.map((format) => {
              const checked = selectedCredential.formats.includes(format)
              return (
                <MiniCheckboxItem
                  key={format}
                  label={formatLabels[format]}
                  checked={checked}
                  // At least one format must be selected
                  disabled={checked && selectedCredential.formats.length === 1}
                  onCheckedChange={(checked) => toggleFormat(format, checked)}
                />
              )
            })}
          </div>
        </Field>
      )}

      <Field label="Attributes">
        <RadioGroup
          className="gap-x-5 gap-y-2"
          value={selectedPresetId}
          onValueChange={(presetId) => {
            if (presetId === 'custom') {
              setIsCustom(true)
              setIsEditingAttributes(true)
              return
            }

            const preset = credential.presets.find((p) => p.id === presetId)
            if (!preset) return
            setIsCustom(false)
            onChange({ ...selectedCredential, attributes: preset.attributes })
          }}
        >
          {credential.presets.map((preset) => (
            <MiniRadioItem key={preset.id} value={preset.id} label={preset.name} />
          ))}
          <MiniRadioItem value="custom" label="Custom" />
        </RadioGroup>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto self-start px-0 text-gray-600 hover:text-gray-900"
          onClick={() => setIsEditingAttributes((isEditing) => !isEditing)}
        >
          {isEditingAttributes
            ? 'Hide attributes'
            : `Show attributes (${selectedCredential.attributes.length} of ${credential.attributes.length} selected)`}
        </Button>

        {isEditingAttributes && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {credential.attributes.map((attribute) => {
              const selectedFormats = attribute.formats.filter((format) => selectedCredential.formats.includes(format))
              const isAvailable = selectedFormats.length > 0

              return (
                <MiniCheckboxItem
                  key={attribute.id}
                  className="text-sm"
                  checked={isAvailable && selectedCredential.attributes.includes(attribute.id)}
                  disabled={!isAvailable}
                  onCheckedChange={(checked) => toggleAttribute(attribute.id, checked)}
                  label={
                    <>
                      <span>{attribute.name}</span>
                      <span
                        className={cn(
                          'text-[10px] uppercase tracking-wide rounded px-1 border',
                          attribute.required ? 'text-accent border-accent/40' : 'text-gray-400 border-gray-200'
                        )}
                      >
                        {attribute.required ? 'Required' : 'Optional'}
                      </span>
                      {attribute.formats.length < credential.formats.length && (
                        <span className="text-xs text-gray-400 font-normal">
                          {attribute.formats.map((format) => formatLabels[format]).join(', ')} only
                        </span>
                      )}
                    </>
                  }
                />
              )
            })}
          </div>
        )}
      </Field>
    </div>
  )
}
