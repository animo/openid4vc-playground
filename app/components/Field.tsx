import type { PropsWithChildren, ReactNode } from 'react'
import { Label } from './ui/label'
import { Switch } from './ui/switch'

export function Field({
  label,
  description,
  htmlFor,
  children,
}: PropsWithChildren<{ label: string; description?: ReactNode; htmlFor?: string }>) {
  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-1">
        <Label htmlFor={htmlFor} className="text-gray-900">
          {label}
        </Label>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export function SwitchField({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start gap-3">
      <Switch id={id} name={id} checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5" />
      <div className="space-y-1">
        <Label htmlFor={id} className="cursor-pointer text-gray-900">
          {label}
        </Label>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
    </div>
  )
}
