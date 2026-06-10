'use client'

import { useState } from 'react'
import { useApiKeys } from '@/lib/api-keys-context'
import { Key, Eye, EyeOff, CheckCircle2, X } from 'lucide-react'

interface ApiKeysModalProps {
  onClose?: () => void
  required?: boolean
}

export function ApiKeysModal({ onClose, required = false }: ApiKeysModalProps) {
  const { keys, setKeys } = useApiKeys()
  const [anthropicKey, setAnthropicKey] = useState(keys.anthropicKey)
  const [show, setShow] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setKeys({ anthropicKey: anthropicKey.trim() })
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      onClose?.()
    }, 1000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111520] border border-white/[0.08] rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <Key className="w-4 h-4 text-brand-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">API Keys</h2>
              <p className="text-xs text-white/35">Stored in your browser only — never sent to our servers</p>
            </div>
          </div>
          {!required && onClose && (
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-400 leading-relaxed">
              Your API key is stored only in your browser session and cleared when you close the tab.
              It is sent directly to the audit API and never stored in any database.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 mb-2">
              Anthropic API Key
            </label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={anthropicKey}
                onChange={e => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full pr-10 pl-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-white/20 outline-none focus:border-brand-500/50 font-mono"
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-white/25">
              Get your key at{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer"
                className="text-brand-500 hover:underline">
                console.anthropic.com
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <button
            onClick={handleSave}
            disabled={!anthropicKey.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saved ? (
              <><CheckCircle2 className="w-4 h-4" /> Saved!</>
            ) : (
              'Save API Key'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
