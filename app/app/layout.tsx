import ToastProvider from '@/components/ToastProvider'
import './globals.css'

import { cn } from '@/lib/utils'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Playground | Animo',
  description: `This playground was built in the context for the EUDI Wallet Prototype Funke. It is only compatible with the current deployed version of Animo's EUDI Wallet Prototype.`,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={cn(inter.className, 'bg-gray-100')}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
