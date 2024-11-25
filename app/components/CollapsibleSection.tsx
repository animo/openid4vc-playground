import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { TypographyH4, TypographyP } from '@/components/ui/typography'
import { ChevronDown, ChevronRight } from 'lucide-react'
import React, { type PropsWithChildren } from 'react'

export const CollapsibleSection = ({
  title,
  titleSmall,
  children,
  initial = 'closed',
}: PropsWithChildren<{ title: string; initial?: 'open' | 'closed'; titleSmall?: string }>) => {
  const [isOpen, setIsOpen] = React.useState(initial === 'open')

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center w-full gap-2">
          {isOpen ? <ChevronDown className="h-8 w-8" /> : <ChevronRight className="h-8 w-8" />}
          <TypographyH4>{title}</TypographyH4>
          {titleSmall && isOpen && (
            <>
              - <p>{titleSmall}</p>
            </>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  )
}
