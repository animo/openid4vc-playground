import ToastProvider from '@/components/ToastProvider'
import './globals.css'

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EUDI Playground | Animo',
  description:
    'This EUDI playground is built by Animo and specifically adapted to work with the France Identité 🇫🇷 wallet.',
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
