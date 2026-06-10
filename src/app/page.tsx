'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Zap, Search, Globe, CheckCircle2, Key } from 'lucide-react'
import { useSession, signIn } from 'next-auth/react'
import { useApiKeys } from '@/lib/api-keys-context'
import { ApiKeysModal } from '@/components/ui/ApiKeysModal'

export default function HomePage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showKeys, setShowKeys] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()
  const { keys, hasKeys } = useApiKeys()

  async function handleAudit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    if (!hasKeys) {
      setShowKeys(true)
      return
    }

    setError('')
    setLoading(true)

    try {
      let auditUrl = url.trim()
      if (!auditUrl.startsWith('http')) auditUrl = `https://${auditUrl}`

      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-anthropic-key': keys.anthropicKey,
        },
        body: JSON.stringify({ url: auditUrl }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to start audit')
        setLoading(false)
        return
      }

      router.push(`/audit/${data.auditId}`)
    } catch {
      setError('Failed to connect. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid-bg">
      {showKeys && <ApiKeysModal onClose={() => setShowKeys(false)} />}

      {/* Nav */}
      <nav className="border-b border-white/[0.06] bg-[#0a0d14]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">SiteAudit</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowKeys(true)}
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                hasKeys
                  ? 'border-green-500/30 text-green-400 bg-green-500/10'
                  : 'border-white/10 text-white/50 hover:text-white hover:border-white/20'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              {hasKeys ? 'API Key Set' : 'Add API Key'}
            </button>
            {session ? (
              <Link href="/dashboard" className="text-sm text-white/70 hover:text-white transition-colors">
                Dashboard
              </Link>
            ) : (
              <button onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                className="text-sm text-white/70 hover:text-white transition-colors">
                Sign In
              </button>
            )}
            <button
              onClick={() => session ? router.push('/dashboard') : signIn('google', { callbackUrl: '/dashboard' })}
              className="text-sm px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-sm font-medium mb-8">
          <Zap className="w-3.5 h-3.5" />
          AI-Powered Website Auditing
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
          Find every issue on
          <span className="text-brand-500"> your website</span>
        </h1>

        <p className="text-lg text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed">
          Comprehensive QA audits powered by Anthropic AI. Detect broken pages, SEO gaps,
          accessibility violations, security issues, and performance bottlenecks.
        </p>

        {/* API key prompt */}
        {!hasKeys && (
          <div className="max-w-2xl mx-auto mb-4">
            <button
              onClick={() => setShowKeys(true)}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm hover:bg-yellow-500/15 transition-colors"
            >
              <Key className="w-4 h-4" />
              Add your Anthropic API key to get started
            </button>
          </div>
        )}

        {/* URL Input */}
        <form onSubmit={handleAudit} className="max-w-2xl mx-auto">
          <div className="flex gap-3 p-2 rounded-xl bg-white/[0.04] border border-white/10 focus-within:border-brand-500/50 transition-colors">
            <div className="flex items-center pl-3">
              <Globe className="w-5 h-5 text-white/30" />
            </div>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="flex-1 bg-transparent text-white placeholder-white/25 outline-none text-base py-2"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors whitespace-nowrap text-sm"
            >
              {loading ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Starting...</>
              ) : (
                <><Search className="w-4 h-4" /> Run Audit</>
              )}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <p className="mt-3 text-xs text-white/25">Your API key stays in your browser — never stored on our servers.</p>
        </form>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: <Search className="w-5 h-5 text-brand-500" />, title: 'Deep Crawl', desc: 'Analyzes up to 20 pages, checking every link, image, and resource.' },
            { icon: <Shield className="w-5 h-5 text-brand-500" />, title: '9 Audit Categories', desc: 'SEO, accessibility, performance, security, content, navigation, and more.' },
            { icon: <Key className="w-5 h-5 text-brand-500" />, title: 'Your Key, Your Data', desc: 'API key stored only in your browser session. Never touches our database.' },
          ].map(f => (
            <div key={f.title} className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-brand-500/20 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center mb-4">{f.icon}</div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="p-8 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <h2 className="text-lg font-semibold text-white mb-6">Everything we check</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              'Broken pages & 404s', 'SSL & security headers', 'Missing alt text',
              'Page titles & meta descriptions', 'Dev/staging URLs in production', 'Core Web Vitals',
              'H1 & heading structure', 'Lorem ipsum / placeholder content', 'Canonical issues',
              'Duplicate titles', 'Noindex pages', 'Slow page load times',
              'Navigation link integrity', 'Image optimisation', 'Form functionality',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm text-white/50">
                <CheckCircle2 className="w-4 h-4 text-brand-500/60 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
