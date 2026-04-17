'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type LayoutSearchContextValue = {
  rawQuery: string
  debouncedQuery: string
  setRawQuery: (query: string) => void
  submitSearch: () => void
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
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const initialSearch = searchParams.get('search') ?? ''
  const [rawQuery, setRawQuery] = useState(initialSearch)
  const rawQueryRef = useRef(rawQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(() => {
    const trimmed = initialSearch.trim()
    return trimmed.length >= minChars ? trimmed : ''
  })

  useEffect(() => {
    rawQueryRef.current = rawQuery
  }, [rawQuery])

  useEffect(() => {
    const searchFromUrl = searchParams.get('search') ?? ''
    const currentRawQuery = rawQueryRef.current
    const shouldPreserveShortInput =
      searchFromUrl.length === 0 && currentRawQuery.trim().length > 0 && currentRawQuery.trim().length < minChars

    if (!shouldPreserveShortInput) {
      setRawQuery(searchFromUrl)
    }

    const trimmed = searchFromUrl.trim()
    setDebouncedQuery(trimmed.length >= minChars ? trimmed : '')
  }, [searchParams, minChars])

  const syncSearchParam = useCallback(
    (query: string) => {
      const trimmed = query.trim()
      const params = new URLSearchParams(searchParams.toString())

      if (trimmed) {
        params.set('search', trimmed)
      } else {
        params.delete('search')
      }

      const nextQuery = params.toString()
      if (nextQuery === searchParams.toString()) {
        return
      }

      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
    },
    [searchParams, router, pathname],
  )

  useEffect(() => {
    const trimmed = rawQuery.trim()

    if (trimmed.length < minChars) {
      setDebouncedQuery('')
      syncSearchParam('')
      return
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(trimmed)
      syncSearchParam(trimmed)
    }, debounceMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [rawQuery, minChars, debounceMs, syncSearchParam])

  const submitSearch = useCallback(() => {
    const trimmed = rawQuery.trim()

    setDebouncedQuery(trimmed.length >= minChars ? trimmed : '')
    syncSearchParam(trimmed)
  }, [rawQuery, minChars, syncSearchParam])

  const value = useMemo(
    () => ({ rawQuery, debouncedQuery, setRawQuery, submitSearch, minChars, debounceMs }),
    [rawQuery, debouncedQuery, minChars, debounceMs, submitSearch],
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
