'use client'

import { CheckIcon } from '@radix-ui/react-icons'
import * as React from 'react'

import { cn } from '@/lib/utils'

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
          'flex items-center gap-2 text-gray-500 font-medium',
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
  credential: {
    name: string
    text_color?: string
    background_color?: string
    background_image?: string
  }
  tags?: string[]
}

const CredentialCardCheckboxItem = React.forwardRef<HTMLInputElement, CredentialCardCheckboxItemProps>(
  ({ credential, tags, className, id, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id ?? generatedId

    const cardStyle = {
      backgroundColor: credential.background_color,
      backgroundImage: credential.background_image ? `url(${credential.background_image})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      color: credential.text_color || '#FFFFFF',
    }

    return (
      <label
        htmlFor={inputId}
        className={cn(
          'group relative flex flex-col h-[150px] lg:h-[175px] cursor-pointer hover:opacity-90 active:scale-98 duration-200 rounded-2xl ring-offset-2',
          'has-checked:ring-2 has-checked:ring-accent has-focus-visible:ring-2 has-focus-visible:ring-gray-400',
          className
        )}
        style={cardStyle}
      >
        <Checkbox ref={ref} id={inputId} className="sr-only" {...props} />
        <div className="p-5">
          <h3 className="font-medium text-sm">{credential.name.toUpperCase()}</h3>
        </div>
        <div className="absolute bottom-4 left-5 flex flex-wrap gap-1 pr-12">
          {tags?.map((tag) => (
            <span key={tag} className="bg-white/80 text-gray-700 text-xs px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
        <div className="absolute bottom-4 right-4 flex items-center justify-center size-5 rounded-md border border-accent bg-white/80 text-white group-has-checked:bg-accent">
          <CheckIcon className="size-4 hidden group-has-checked:block" />
        </div>
      </label>
    )
  }
)
CredentialCardCheckboxItem.displayName = 'CredentialCardCheckboxItem'

export { Checkbox, CredentialCardCheckboxItem, MiniCheckboxItem }
