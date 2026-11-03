'use client'

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { Circle } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'
import { CredentialCard, type CredentialCardDisplay } from './credential-card'

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return <RadioGroupPrimitive.Root className={cn('flex flex-wrap gap-4', className)} {...props} ref={ref} />
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item & { color: string }>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, color = 'accent', ...props }, ref) => {
  const tailwindColor = color.startsWith('#') ? `[${color}]` : color
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        `size-5 flex justify-center rounded-full border border-${tailwindColor} text-${tailwindColor} shadow-sm focus:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50`,
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="self-center">
        <div
          style={{
            // Somehow tailwind hex color syntax doesn't work for all colors :(
            backgroundColor: color.startsWith('#') ? color : undefined,
          }}
          className={cn('size-4 rounded-full', color.startsWith('#') ? undefined : `bg-${color}`)}
        />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

export interface CredentialCardRadioItemProps extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  id: string
  issuer: { logo: string; name: string }
  credential: CredentialCardDisplay
  tags?: string[]
}

const CredentialCardRadioItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  CredentialCardRadioItemProps
>(({ issuer, credential, tags, className, ...props }, ref) => (
  <CredentialCard
    htmlFor={props.id}
    className={className}
    credential={credential}
    issuer={issuer}
    tags={tags}
    indicator={
      <RadioGroupPrimitive.Item
        ref={ref}
        className="flex size-5 items-center justify-center rounded-full border border-gray-300 bg-white/90 shadow-xs focus-visible:outline-hidden data-[state=checked]:border-accent"
        {...props}
      >
        <RadioGroupPrimitive.Indicator className="size-3 rounded-full bg-accent" />
      </RadioGroupPrimitive.Item>
    }
  />
))
CredentialCardRadioItem.displayName = 'CredentialCardRadioItem'

const MiniRadioItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & {
    label: string | React.ReactNode
  }
>(({ className, label, ...props }, ref) => {
  return (
    <label
      htmlFor={props.id}
      className={cn(
        'flex group duration-200 items-center gap-2 text-sm text-gray-700',
        props.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      )}
    >
      <RadioGroupPrimitive.Item
        ref={ref}
        className={cn(
          'aspect-square size-4 shrink-0 rounded-full border border-gray-300 text-accent shadow-xs focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 data-[state=checked]:border-accent disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
          <Circle className="size-2.5 fill-accent" />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>
      <span className="group-active:scale-98">{label}</span>
    </label>
  )
})
MiniRadioItem.displayName = 'MiniRadioItem'

export { CredentialCardRadioItem, MiniRadioItem, RadioGroup, RadioGroupItem }
