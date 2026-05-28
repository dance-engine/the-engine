import { useMemo } from 'react'
import { groupByToArray, getNestedValue } from '@dance-engine/utils/arrayHelpers'
import { BasicListColumnValueAdapter } from '@dance-engine/ui/types'

export type BasicListSort = { key: string; direction: 'asc' | 'desc' }

type UseBasicListRecordsParams = {
  records: Record<string, unknown>[]
  sort: BasicListSort
  columns: string[]
  columnValueAdapters?: Record<string, BasicListColumnValueAdapter>
  searchQuery: string
  searchMinChars: number
  entity: string
  includeArchived?: boolean
  archivedOnly?: boolean
}

const normalizeSearchTerm = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function useBasicListRecords({
  records,
  sort,
  columns,
  columnValueAdapters,
  searchQuery,
  searchMinChars,
  entity,
  includeArchived = false,
  archivedOnly = false,
}: UseBasicListRecordsParams) {
  const sortedRecords = useMemo(() => {
    if (!sort.key) return records

    return [...records].sort((a, b) => {
      const aValue = getNestedValue(a, sort.key)
      const bValue = getNestedValue(b, sort.key)

      const normalizeForSort = (value: unknown): string | number => {
        if (typeof value === 'symbol') {
          return value.description ?? value.toString()
        }

        if (value instanceof Date) {
          return value.getTime()
        }

        if (typeof value === 'number') {
          return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value
        }

        if (typeof value === 'boolean') {
          return value ? 1 : 0
        }

        return String(value).toLowerCase()
      }

      if (aValue === undefined) return 1
      if (bValue === undefined) return -1
      if (aValue === bValue) return 0

      const aComparable = normalizeForSort(aValue)
      const bComparable = normalizeForSort(bValue)

      if (typeof aComparable === 'number' && typeof bComparable === 'number') {
        return sort.direction === 'asc' ? aComparable - bComparable : bComparable - aComparable
      }

      const order = String(aComparable).localeCompare(String(bComparable), undefined, {
        numeric: true,
        sensitivity: 'base',
      })

      return sort.direction === 'asc' ? order : -order
    })
  }, [records, sort])

  const filteredRecords = useMemo(() => {
    const query = normalizeSearchTerm(searchQuery)
    if (!query || query.length < searchMinChars) return sortedRecords

    return sortedRecords.filter((record) => {
      return columns.some((col) => {
        const value = getNestedValue(record, col)
        if (value === undefined || value === null) return false

        const adapter = columnValueAdapters?.[col]
        const searchableText = normalizeSearchTerm(
          adapter?.searchText ? adapter.searchText(value, record) : String(value ?? ''),
        )

        return searchableText.includes(query)
      })
    })
  }, [sortedRecords, columns, columnValueAdapters, searchMinChars, searchQuery])

  const totalVisibleRecords = useMemo(() => {
    if (archivedOnly) {
      return records.filter((record) => record?.status === 'archived').length
    }

    if (includeArchived) {
      return records.length
    }

    return records.filter((record) => record?.status !== 'archived').length
  }, [records, includeArchived, archivedOnly])

  const visibleFilteredRecords = useMemo(() => {
    if (archivedOnly) {
      return filteredRecords.filter((record) => record?.status === 'archived')
    }

    if (includeArchived) {
      return filteredRecords
    }

    return filteredRecords.filter((record) => record?.status !== 'archived')
  }, [filteredRecords, includeArchived, archivedOnly])

  const groupedVisibleRecords = useMemo(() => {
    return groupByToArray(visibleFilteredRecords, (r) => getNestedValue(r, 'meta.saved'))
  }, [visibleFilteredRecords])

  const activeQuery = searchQuery.trim()
  const hasActiveSearch = activeQuery.length >= searchMinChars
  const isNoSourceRecords = totalVisibleRecords === 0
  const isFullyFilteredOut = !isNoSourceRecords && hasActiveSearch && visibleFilteredRecords.length === 0
  const countCaption = `${visibleFilteredRecords.length} of ${totalVisibleRecords} shown`
  const emptyStateMessage = isNoSourceRecords
    ? `No ${entity?.toLowerCase()} records found in API or local cache.`
    : isFullyFilteredOut
      ? `No matching ${entity?.toLowerCase()} records for "${activeQuery}".`
      : `No ${entity?.toLowerCase()} records to display.`

  return {
    visibleFilteredRecords,
    groupedVisibleRecords,
    isFullyFilteredOut,
    countCaption,
    emptyStateMessage,
  }
}
