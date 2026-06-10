'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface ApiKeys {
  anthropicKey: string
}

interface ApiKeysContextType {
  keys: ApiKeys
  setKeys: (keys: ApiKeys) => void
  hasKeys: boolean
}

const ApiKeysContext = createContext<ApiKeysContextType>({
  keys: { anthropicKey: '' },
  setKeys: () => {},
  hasKeys: false,
})

export function ApiKeysProvider({ children }: { children: ReactNode }) {
  const [keys, setKeysState] = useState<ApiKeys>({ anthropicKey: '' })

  useEffect(() => {
    const stored = sessionStorage.getItem('siteaudit_keys')
    if (stored) {
      try { setKeysState(JSON.parse(stored)) } catch {}
    }
  }, [])

  function setKeys(newKeys: ApiKeys) {
    setKeysState(newKeys)
    sessionStorage.setItem('siteaudit_keys', JSON.stringify(newKeys))
  }

  const hasKeys = !!keys.anthropicKey

  return (
    <ApiKeysContext.Provider value={{ keys, setKeys, hasKeys }}>
      {children}
    </ApiKeysContext.Provider>
  )
}

export const useApiKeys = () => useContext(ApiKeysContext)
