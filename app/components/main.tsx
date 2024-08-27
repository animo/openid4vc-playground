'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VerifyTab } from './VerifyTab'
import { IssueTab } from './IssueTab'
import { ReceiveTab } from './ReceiveTab'

export function Main() {
  return (
    <>
      <main key="1" className="flex flex-col min-h-screen bg-gray-100">
        <div className="flex items-center justify-between bg-gray-100 w-full p-4">
          <div className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Logo"
              className="w-120 h-20"
              height="50"
              src="/logo.svg"
              style={{
                objectFit: 'contain',
              }}
              width="200"
            />
          </div>
          <span className="inline-block bg-green-500 text-white text-sm px-2 py-1 rounded-full">Playground</span>
        </div>
        <div className="flex w-full items-center justify-center">
          <Tabs className="w-full max-w-5xl px-6" defaultValue="verify">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="verify">Verify</TabsTrigger>
              <TabsTrigger value="issue">Issue</TabsTrigger>
              <TabsTrigger value="receive">Receive</TabsTrigger>
            </TabsList>
            <TabsContent value="verify">
              <VerifyTab />
            </TabsContent>
            <TabsContent value="issue">
              <IssueTab disabled />
            </TabsContent>
            <TabsContent value="receive">
              <ReceiveTab disabled />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  )
}
