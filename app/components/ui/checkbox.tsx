'use client'

import { CheckIcon } from '@radix-ui/react-icons'
import * as React from 'react'

import { cn } from '@/lib/utils'
import { CredentialCard, type CredentialCardDisplay } from './credential-card'

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> & {
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, onCheckedChange, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn('size-4 shrink-0 cursor-pointer accent-accent disabled:cursor-not-allowed', className)}
    onChange={(event) => onCheckedChange?.(event.target.checked)}
    {...props}
  />
))
Checkbox.displayName = 'Checkbox'

const MiniCheckboxItem = React.forwardRef<HTMLInputElement, CheckboxProps & { label: string | React.ReactNode }>(
  ({ label, className, id, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id ?? generatedId

    return (
      <label
        htmlFor={inputId}
        className={cn(
          'flex items-center gap-2 text-sm text-gray-700',
          props.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className
        )}
      >
        <Checkbox ref={ref} id={inputId} {...props} />
        {label}
      </label>
    )
  }
)
MiniCheckboxItem.displayName = 'MiniCheckboxItem'

export interface CredentialCardCheckboxItemProps extends CheckboxProps {
  credential: CredentialCardDisplay
  tags?: string[]
}

const CredentialCardCheckboxItem = React.forwardRef<HTMLInputElement, CredentialCardCheckboxItemProps>(
  ({ credential, tags, className, id, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id ?? generatedId

    return (
      <CredentialCard
        htmlFor={inputId}
        className={className}
        credential={credential}
        tags={tags}
        indicator={
          <>
            <Checkbox ref={ref} id={inputId} className="peer sr-only" {...props} />
            <span className="flex size-5 items-center justify-center rounded-md border border-gray-300 bg-white/90 text-white shadow-xs peer-checked:border-accent peer-checked:bg-accent">
              <CheckIcon className="size-4" />
            </span>
          </>
        }
      />
    )
  }
)
CredentialCardCheckboxItem.displayName = 'CredentialCardCheckboxItem'

export { Checkbox, CredentialCardCheckboxItem, MiniCheckboxItem }
