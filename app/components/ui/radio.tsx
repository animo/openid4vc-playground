'use client'

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { BanknoteIcon, CarIcon, Circle, GlobeIcon, HeartPulseIcon, InfoIcon, LandmarkIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

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

const CardRadioItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupItem>,
  React.ComponentPropsWithoutRef<typeof RadioGroupItem> & {
    label: string
    description?: string | React.ReactNode
    tags?: string[]
    icon: string | React.ReactNode
  }
>(({ label, description, className, icon = 'default', tags, ...props }, ref) => {
  return (
    <div className="group flex-1">
      <label
        htmlFor={props.id}
        className={cn(
          'flex flex-col h-full cursor-pointer hover:bg-gray-100 active:scale-98 duration-200 hover:shadow-xs gap-2 border border-gray-200 p-4 rounded-lg data-[state=checked]:border-accent',
          'group-has-data-[state=checked]:border-accent group-has-data-[state=checked]:bg-accent/5',
          className
        )}
      >
        <div className="flex justify-between items-center">
          <div
            className={cn(
              'flex items-center justify-center',
              icon === 'string' ? 'size-8 bg-accent/20 rounded-lg ' : ''
            )}
          >
            {typeof icon === 'string' ? <RadioGroupIcon icon={icon as keyof typeof iconMap} /> : icon}
          </div>
          <RadioGroupItem ref={ref} {...props} />
        </div>
        <div className="flex justify-between w-full items-center space-x-2">
          <span className="font-medium">{label}</span>
        </div>
        {description && <span className="text-xs text-gray-500">{description}</span>}
        <div className="flex flex-wrap gap-2">
          {tags?.map((t) => (
            <span key={t} className="border-accent border bg-accent text-white text-sm px-3 py-0.5 rounded-lg">
              {t}
            </span>
          ))}
        </div>
      </label>
    </div>
  )
})
CardRadioItem.displayName = 'CardRadioItem'

export interface CredentialCardRadioItemProps extends React.ComponentPropsWithoutRef<typeof RadioGroupItem> {
  issuer: {
    logo: string
    name: string
  }
  credential: {
    name: string
    text_color?: string
    background_color?: string
    background_image?: string
  }
}

const CredentialCardRadioItem = React.forwardRef<React.ElementRef<typeof RadioGroupItem>, CredentialCardRadioItemProps>(
  ({ issuer, credential, className, ...props }, ref) => {
    const cardStyle = {
      backgroundColor: credential.background_color,
      backgroundImage: credential.background_image ? `url(${credential.background_image})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      color: credential.text_color || '#FFFFFF',
    }

    return (
      <div className="group flex-1">
        <label
          htmlFor={props.id}
          className={cn(
            'relative flex flex-col h-[150px] lg:h-[175px] cursor-pointer hover:opacity-90 active:scale-98 duration-200 rounded-2xl',
            className
          )}
          style={cardStyle}
        >
          <div className="p-5 flex flex-col">
            <div className="flex justify-between gap-3 mb-4">
              <h3 className="font-medium text-sm">{credential.name.toUpperCase()}</h3>
              <div className="size-10">
                <img src={issuer.logo} alt={`${issuer.name} logo`} className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="absolute bottom-4 right-4">
              <RadioGroupItem ref={ref} {...props} color={'accent'} />
            </div>
          </div>
        </label>
      </div>
    )
  }
)

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
      className="flex group cursor-pointer duration-200 items-center gap-2 text-gray-500 font-medium"
    >
      <RadioGroupPrimitive.Item
        ref={ref}
        className={cn(
          'aspect-square h-5 w-5 rounded-full border border-accent text-accent shadow-sm focus:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
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

export { CardRadioItem, MiniRadioItem, RadioGroup, RadioGroupItem, CredentialCardRadioItem }

const iconMap = {
  default: InfoIcon,
  government: LandmarkIcon,
  bank: BanknoteIcon,
  health: HeartPulseIcon,
  interop: GlobeIcon,
  'car-rental': CarIcon,
}
const RadioGroupIcon = ({ icon }: { icon: keyof typeof iconMap }) => {
  const Icon = iconMap[icon]
  return <Icon className="size-6 text-accent" />
}
