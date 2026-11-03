'use client'

import { GitHubLogoIcon } from '@radix-ui/react-icons'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IssueTab } from './IssueTab'
import { VerifyBlock } from './VerifyBlock'
import { X509Tab } from './X509Tab'

export function Main() {
  const searchParams = useSearchParams()
  return (
    <main key="1" className="flex min-h-screen flex-col bg-gray-100">
      <div className="flex w-full items-center justify-center px-4 pt-10 pb-8">
        <div className="relative grid gap-2">
          <Image alt="Logo" className="h-4 md:h-6 w-auto object-contain" height={256} width={256} src="/logo.svg" />
          <div className="flex w-full justify-between">
            {['P', 'L', 'A', 'Y', 'G', 'R', 'O', 'U', 'N', 'D'].map((char, _i) => (
              <span key={char} className="text-xs text-gray-500 font-medium">
                {char}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex w-full items-center justify-center">
        <Tabs className="w-full max-w-5xl px-3 sm:px-6" defaultValue={searchParams.get('tab') ?? 'verify'}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="verify">Verify</TabsTrigger>
            <TabsTrigger value="issue">Issue</TabsTrigger>
            <TabsTrigger value="x509">
              <span className="sm:hidden">Certificates</span>
              <span className="hidden sm:inline">Manage Certificates</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="verify">
            <VerifyBlock searchParams={searchParams} />
          </TabsContent>
          <TabsContent value="issue">
            <IssueTab searchParams={searchParams} />
          </TabsContent>
          <TabsContent value="x509">
            <X509Tab />
          </TabsContent>
        </Tabs>
      </div>
      <footer className="flex w-full flex-col items-center justify-center gap-3 px-4 py-8 text-gray-500 text-sm sm:flex-row sm:gap-8">
        <a className="flex items-center gap-2 hover:text-gray-900" href="https://github.com/animo/openid4vc-playground">
          <GitHubLogoIcon /> Playground GitHub
        </a>
        <p>
          Built with ❤️ by{' '}
          <a className="hover:text-gray-900" href="https://animo.id">
            Animo
          </a>
        </p>
        <a
          className="flex items-center gap-2 hover:text-gray-900"
          href="https://github.com/animo/paradym-wallet/tree/main/apps/easypid"
        >
          <GitHubLogoIcon /> Paradym Wallet GitHub
        </a>
      </footer>
    </main>
  )
}
