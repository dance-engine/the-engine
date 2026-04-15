'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type LayoutSearchContextValue = {
  rawQuery: string
  debouncedQuery: string
  setRawQuery: (query: string) => void
  minChars: number
  debounceMs: number
}

const LayoutSearchContext = createContext<LayoutSearchContextValue | undefined>(undefined)

export function LayoutSearchProvider({
  children,
  minChars = 3,
  debounceMs = 500,
}: {
  children: React.ReactNode
  minChars?: number
  debounceMs?: number
}) {
  const [rawQuery, setRawQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const trimmed = rawQuery.trim()

    if (trimmed.length < minChars) {
      setDebouncedQuery('')
      return
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(trimmed)
    }, debounceMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [rawQuery, minChars, debounceMs])

  const value = useMemo(
    () => ({ rawQuery, debouncedQuery, setRawQuery, minChars, debounceMs }),
    [rawQuery, debouncedQuery, minChars, debounceMs],
  )

  return <LayoutSearchContext.Provider value={value}>{children}</LayoutSearchContext.Provider>
}

export function useLayoutSearch() {
  const context = useContext(LayoutSearchContext)
  if (!context) {
    throw new Error('useLayoutSearch must be used within LayoutSearchProvider')
  }
  return context
}
