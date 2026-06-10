'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'

interface AuditFormProps {
  placeholder?: string
  size?: 'default' | 'compact'
}

export function AuditForm({ placeholder = 'https://yourwebsite.com', size = 'default' }: AuditFormProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setError('')
    setLoading(true)

    try {
      let auditUrl = url.trim()
      if (!auditUrl.startsWith('http')) auditUrl = `https://${auditUrl}`

      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-3 p-2 rounded-xl bg-white/[0.04] border border-white/10 focus-within:border-brand-500/50 transition-colors">
        <div className="flex items-center pl-3">
          <Globe className={size === 'compact' ? 'w-4 h-4 text-white/30' : 'w-5 h-5 text-white/30'} />
        </div>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white placeholder-white/25 outline-none text-sm py-2"
          disabled={loading}
        />
        <Button type="submit" loading={loading} disabled={!url.trim()} size={size === 'compact' ? 'sm' : 'md'}>
          {!loading && <Search className="w-4 h-4" />}
          {loading ? 'Starting...' : 'Run Audit'}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </form>
  )
}
