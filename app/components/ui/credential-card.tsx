import type * as React from 'react'

import { cn } from '@/lib/utils'

export type CredentialCardDisplay = {
  name: string
  text_color?: string
  background_color?: string
  background_image?: string
}

/** The card a credential selector renders in, a `<label>` around a checkbox or radio. */
export function CredentialCard({
  htmlFor,
  credential,
  issuer,
  tags,
  indicator,
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & {
  htmlFor: string
  credential: CredentialCardDisplay
  issuer?: { name: string; logo: string }
  tags?: string[]
  indicator: React.ReactNode
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'group relative flex aspect-[1.586] w-full max-w-sm cursor-pointer flex-col justify-self-center rounded-xl ring-offset-2 transition-[box-shadow,opacity,scale] duration-200 hover:opacity-90 active:scale-98 sm:max-w-none motion-reduce:transition-none',
        'has-checked:ring-2 has-checked:ring-accent has-data-[state=checked]:ring-2 has-data-[state=checked]:ring-accent',
        'has-focus-visible:ring-2 has-focus-visible:ring-gray-400',
        className
      )}
      style={{
        backgroundColor: credential.background_color,
        backgroundImage: credential.background_image ? `url(${credential.background_image})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        color: credential.text_color || '#FFFFFF',
      }}
      {...props}
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <span className="min-w-0 text-sm font-medium leading-snug">{credential.name}</span>
        {issuer && (
          // biome-ignore lint/performance/noImgElement: issuer logos are served by the agent
          <img
            src={issuer.logo}
            alt={`Issued by ${issuer.name}`}
            title={`Issued by ${issuer.name}`}
            className="size-8 shrink-0 object-contain"
          />
        )}
      </div>
      <div className="absolute right-9 bottom-3 left-4 flex flex-wrap gap-1">
        {tags?.map((tag) => (
          <span key={tag} className="rounded-full bg-white/80 px-1.5 py-0.5 text-[11px] text-gray-700 leading-none">
            {tag}
          </span>
        ))}
      </div>
      <div className="absolute right-3 bottom-3">{indicator}</div>
    </label>
  )
}
