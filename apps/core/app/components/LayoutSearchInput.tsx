'use client'

import { useLayoutSearch } from './LayoutSearchContext'

export default function LayoutSearchInput() {
  const { rawQuery, setRawQuery, submitSearch, minChars } = useLayoutSearch()

  return (
    <input
      type="search"
      name="search"
      aria-label="Search"
      className="col-start-1 row-start-1 block size-full pl-8 text-base text-gray-900 outline-none placeholder:text-gray-400 sm:text-sm/6"
      placeholder={`Search (min ${minChars} chars)`}
      value={rawQuery}
      onChange={(event) => setRawQuery(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          submitSearch()
        }
      }}
    />
  )
}
