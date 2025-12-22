import ToastProvider from '@/components/ToastProvider'
import './globals.css'

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Playground | Animo',
  description:
    'This playground implements OpenID4VC 1.0, OpenID4VP 1.0, SD-JWT VC, mDOC, and most of the High Assurance Interop Profile (full supporting pending).',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={cn(inter.className, 'bg-gray-100')}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
