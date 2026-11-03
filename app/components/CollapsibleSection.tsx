import { ChevronRight } from 'lucide-react'
import React, { type PropsWithChildren } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

export const CollapsibleSection = ({
  title,
  titleSmall,
  children,
  initial = 'closed',
}: PropsWithChildren<{ title: string; initial?: 'open' | 'closed'; titleSmall?: string }>) => {
  const [isOpen, setIsOpen] = React.useState(initial === 'open')

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="rounded-lg border border-gray-200 bg-white">
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronRight
          className={cn(
            'size-4 shrink-0 text-gray-400 transition-transform motion-reduce:transition-none',
            isOpen && 'rotate-90'
          )}
        />
        <span className="flex-1">{title}</span>
        {titleSmall && isOpen && <span className="text-xs font-normal text-gray-500">{titleSmall}</span>}
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-gray-200">{children}</CollapsibleContent>
    </Collapsible>
  )
}
