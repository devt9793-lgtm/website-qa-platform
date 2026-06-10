import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import { ApiKeysProvider } from '@/lib/api-keys-context'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'SiteAudit — Professional Website QA Platform',
  description: 'Comprehensive AI-powered website quality audits.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#0a0d14] text-white antialiased">
        <SessionProvider session={session}>
          <ApiKeysProvider>
            {children}
          </ApiKeysProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
