'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GitHubLogoIcon } from '@radix-ui/react-icons'
import Image from 'next/image'

import { IssueTab } from './IssueTab'
import { VerifyBlock } from './VerifyBlock'
import { X509Tab } from './X509Tab'

export function Main() {
  return (
    <>
      <main key="1" className="flex flex-col gap-2 min-h-screen bg-gray-100">
        <div className="flex items-center justify-center w-full p-8">
          <div className="relative grid gap-2">
            <Image alt="Logo" className="h-4 md:h-6 w-auto object-contain" height={256} width={256} src="/logo.svg" />
            <div className="flex w-full justify-between">
              {['P', 'L', 'A', 'Y', 'G', 'R', 'O', 'U', 'N', 'D'].map((char, i) => (
                <span key={char} className="text-xs text-gray-500 font-medium">
                  {char}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex w-full items-center justify-center">
          <Tabs className="w-full max-w-5xl px-6" defaultValue="verify">
            <TabsList className="grid w-full grid-cols-3 gap-2">
              <TabsTrigger value="verify">Verify</TabsTrigger>
              <TabsTrigger value="issue">Issue</TabsTrigger>
              <TabsTrigger value="x509">Manage Certificates</TabsTrigger>
            </TabsList>
            <TabsContent value="verify">
              <VerifyBlock />
            </TabsContent>
            <TabsContent value="issue">
              <IssueTab />
            </TabsContent>
            <TabsContent value="x509">
              <X509Tab />
            </TabsContent>
          </Tabs>
        </div>
        <footer className="flex items-center justify-center w-full p-4 gap-8">
          <p className="text-sm text-gray-500">
            <a className="flex items-center gap-2" href="https://github.com/animo/openid4vc-playground-funke">
              <GitHubLogoIcon /> Playground GitHub
            </a>
          </p>
          <p className="text-sm text-gray-500">
            Built with ❤️ by <a href="https://animo.id">Animo</a>
          </p>
          <p className="text-sm text-gray-500">
            <a
              className="flex items-center gap-2"
              href="https://github.com/animo/paradym-wallet/tree/main/apps/easypid"
            >
              <GitHubLogoIcon /> EUDI Wallet Protoype GitHub
            </a>
          </p>
        </footer>
      </main>
    </>
  )
}
