import { Cross2Icon } from '@radix-ui/react-icons'
import { useState } from 'react'
import type { PresentationCredential, PresentationCredentialFormat, PresentationCredentialSelection } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { CredentialCardCheckboxItem, MiniCheckboxItem } from './ui/checkbox'
import { Label } from './ui/label'
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

export function CredentialRequestBuilder({
  credentials,
  selection,
  onSelectionChange,
}: {
  credentials: PresentationCredential[]
  selection: PresentationCredentialSelection
  onSelectionChange: (selection: PresentationCredentialSelection) => void
}) {
  const toggleCredential = (credential: PresentationCredential, checked: boolean) =>
    onSelectionChange({
      ...selection,
      credentials: checked
        ? [...selection.credentials, getDefaultCredentialSelection(credential)]
        : selection.credentials.filter((c) => c.id !== credential.id),
    })

  const updateCredential = (updated: SelectedCredential) =>
    onSelectionChange({
      ...selection,
      credentials: selection.credentials.map((c) => (c.id === updated.id ? updated : c)),
    })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <span className="text-accent font-medium text-lg">Credentials</span>
        <p className="text-gray-500 text-sm">Select one or more credentials to request from the wallet.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 py-3">
          {credentials.map((credential) => (
            <CredentialCardCheckboxItem
              key={credential.id}
              checked={selection.credentials.some((c) => c.id === credential.id)}
              onCheckedChange={(checked) => toggleCredential(credential, checked)}
              credential={{
                name: credential.display.name,
                background_color: credential.display.background_color,
                background_image: credential.display.background_image?.uri,
                text_color: credential.display.text_color,
              }}
              tags={credential.formats.map((format) => formatLabels[format])}
            />
          ))}
        </div>
      </div>

      {selection.credentials.length > 1 && (
        <div className="space-y-2">
          <div>
            <Label htmlFor="combination">Combination</Label>
            <p className="text-gray-500 text-sm">
              Whether the wallet has to present all selected credentials, or only one of them.
            </p>
          </div>
          <RadioGroup
            name="combination"
            className="flex flex-col gap-2 md:gap-4 md:flex-row"
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
        </div>
      )}

      {selection.credentials.map((selectedCredential) => {
        const credential = credentials.find((c) => c.id === selectedCredential.id)
        if (!credential) return null

        return (
          <SelectedCredentialConfiguration
            key={credential.id}
            credential={credential}
            selectedCredential={selectedCredential}
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
  selectedCredential,
  onChange,
  onRemove,
}: {
  credential: PresentationCredential
  selectedCredential: SelectedCredential
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
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
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

      {credential.formats.length > 1 && (
        <div className="space-y-2">
          <div>
            <Label>Format</Label>
            <p className="text-gray-500 text-sm">
              When multiple formats are selected, the wallet can present the credential in either format.
            </p>
          </div>
          <div className="flex flex-row gap-4">
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
        </div>
      )}

      <div className="space-y-2">
        <Label>Attributes</Label>
        <RadioGroup
          className="flex flex-wrap gap-x-4 gap-y-2"
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
          className="px-0 h-auto text-accent"
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
      </div>
    </div>
  )
}
