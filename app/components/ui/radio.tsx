'use client'

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { Circle } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'
import { Label } from './label'

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return <RadioGroupPrimitive.Root className={cn('grid gap-2', className)} {...props} ref={ref} />
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'aspect-square h-5 w-5 rounded-full border border-accent text-accent shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="size-4 fill-accent" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

const CardRadioItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupItem>,
  React.ComponentPropsWithoutRef<typeof RadioGroupItem> & {
    label: string
    description: string
    icon: string
  }
>(({ label, description, className, icon = 'default', ...props }, ref) => {
  return (
    <div className="group">
      <label
        htmlFor={props.id}
        className={cn(
          'flex flex-col border-1 border-transparent cursor-pointer hover:bg-gray-100 active:scale-98 duration-200 hover:shadow-sm gap-2 border border-gray-200 p-4 rounded-lg data-[state=checked]:border-accent',
          'group-has-[[data-state=checked]]:border-accent group-has-[[data-state=checked]]:bg-accent/5',

          className
        )}
      >
        <div className="flex justify-between items-center">
          <div className="size-8 bg-accent/20 rounded-lg flex items-center justify-center">
            <RadioGroupIcon icon={icon as keyof typeof iconMap} />
          </div>
          <RadioGroupItem ref={ref} {...props} />
        </div>
        <div className="flex justify-between w-full items-center space-x-2">
          <span className="font-medium">{label}</span>
        </div>
        <span className="text-xs text-gray-500 line-clamp-1">{description}</span>
      </label>
    </div>
  )
})
CardRadioItem.displayName = 'CardRadioItem'

const MiniRadioItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & {
    label: string
  }
>(({ className, label, ...props }, ref) => {
  return (
    <label
      htmlFor={props.id}
      className="flex group cursor-pointer duration-200 items-center gap-2 text-gray-500 font-medium"
    >
      <RadioGroupPrimitive.Item
        ref={ref}
        className={cn(
          'aspect-square h-5 w-5 rounded-full border border-accent text-accent shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
          <Circle className="size-4 fill-accent" />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>
      <span className="text-gray-500 group-active:scale-98 font-medium">{label}</span>
    </label>
  )
})
MiniRadioItem.displayName = 'MiniRadioItem'

export { CardRadioItem, MiniRadioItem, RadioGroup, RadioGroupItem }

import { InfoCircledIcon } from '@radix-ui/react-icons'

const iconMap = {
  default: InfoCircledIcon,
  government: InfoCircledIcon,
  bank: InfoCircledIcon,
  health: InfoCircledIcon,
  'car-rental': InfoCircledIcon,
}

const RadioGroupIcon = ({ icon }: { icon: keyof typeof iconMap }) => {
  const Icon = iconMap[icon]
  return <Icon className="size-5 text-accent" />
}
