'use client'
import { Fragment } from 'react/jsx-runtime'
import { useMemo, useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { eventMetadata } from '@dance-engine/schemas/events'
import { BasicListProps } from '@dance-engine/ui/types' 
import { labelFromSnake, formatField, nameFromHypenated } from '@dance-engine/utils/textHelpers'
import { deDupKeys,groupByToArray, getNestedValue } from '@dance-engine/utils/arrayHelpers'
import DestructiveButton from '../general/DestructiveButton'
import { MdModeEdit, MdDeleteOutline } from "react-icons/md";
import { LuPackage } from "react-icons/lu";
import { useAuth } from '@clerk/nextjs'
import { IoTicketOutline } from "react-icons/io5";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import ActionIconButton from '../actions/ActionIconButton';
import ActionRow from '../actions/ActionRow';

const BasicList: React.FC<BasicListProps<React.HTMLAttributes<HTMLTableElement>>> = ({
  entity,
  columns,
  formats,
  records,
  columnValueAdapters,
  searchQuery = '',
  searchMinChars = 3,
  onClearSearch,
  activeOrg,
  parentKsuid,
  parentEntityName,
  showEditAction = true,
  showDeleteAction = true,
  rowActions,
  ...tableProps
}: BasicListProps<React.HTMLAttributes<HTMLTableElement>>) => {
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: '', direction: 'asc' });

  const { getToken } = useAuth()
  const entityTypeSlug = `${entity?.toLowerCase()}s`
  const apiBaseUrl = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NEXT_PUBLIC_DANCE_ENGINE_API ?? ''
  const entityApiUrl = `${apiBaseUrl}/${activeOrg}/${entityTypeSlug}` 
  const firstHeaderClasses = "pr-3 pl-4 sm:pl-4 lg:pl-8"
  const restHeaderClasses = "px-3"
  const allHeaderClasses = "py-3.5 text-left text-sm font-semibold text-gray-900"
  const columnKeys = deDupKeys(columns)
  const hasActionsColumn = entity === "EVENT" || showEditAction || showDeleteAction || Boolean(rowActions)
  const showMobileEventDateTimeBlock = entity === 'EVENT' && columns.includes('starts_at') && columns.includes('ends_at')
  const metadataByEntity: Partial<Record<string, Record<string, unknown>>> = {
    EVENT: eventMetadata as Record<string, unknown>,
  }

  const getColumnMetadata = (col: string) => {
    const entityMetadata = metadataByEntity[entity]
    if (!entityMetadata) return undefined

    return col.split('.').reduce<unknown>((meta, segment) => {
      if (!meta || typeof meta !== 'object') return undefined
      return (meta as Record<string, unknown>)[segment]
    }, entityMetadata)
  }

  const getCheckboxValues = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean)
    }

    if (typeof value === 'string') {
      return value.split(',').map((item) => item.trim()).filter(Boolean)
    }

    return []
  }

  const toDateOrNull = (value: unknown): Date | null => {
    if (!value) return null
    const date = value instanceof Date ? value : new Date(String(value))
    return Number.isNaN(date.getTime()) ? null : date
  }

  const formatDatePart = (value: Date | null) => {
    if (!value) return '-'
    return format(value, 'dd MMM yyyy')
  }

  const formatTimePart = (value: Date | null) => {
    if (!value) return '-'
    return format(value, 'HH:mm')
  }

  const getDisplayValue = (col: string, value: unknown, record: Record<string, unknown>) => {
    const adapter = columnValueAdapters?.[col]
    if (adapter?.displayValue) {
      return adapter.displayValue(value, record)
    }

    const columnMetadata = getColumnMetadata(col) as { checkboxesField?: boolean } | undefined
    if (columnMetadata?.checkboxesField) {
      const checkboxValues = getCheckboxValues(value)
      if (!checkboxValues.length) return '-'

      return (
        <div className="flex flex-wrap gap-1">
          {checkboxValues.map((checkboxValue) => (
            <span
              key={`${col}-${checkboxValue}`}
              className="inline-flex items-baseline rounded-full bg-pear-logo px-2 pt-0 pb-0.5 text-xs font-medium text-dark-highlight"
            >
              {labelFromSnake(checkboxValue)}
            </span>
          ))}
        </div>
      )
    }

    return formatField(String(value || ''), formats?.[columns.indexOf(col)]) || "-"
  }

  const handleDelete = async (record: Record<string, unknown>) => {
    console.log("Deleting record:", record)
    const token = await getToken()
      fetch(`${entityApiUrl}/${record.ksuid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({[entity?.toLowerCase()]: { ...record, status: "archived" }}),
      }).then(res => {
        if (res.ok) {
          //alert(`${entity} deleted successfully!`);
          window.location.reload();
        } else {
          //alert(`Failed to delete ${entity}. Please try again.`);
        }
      }).catch(err => {
        console.error("Error deleting entity:", err);
        //alert(`An error occurred while deleting the ${entity}.`);
      });

  }

  const sortToggle = (col: string) => {
    if (sort.key === col) {
      if(sort.direction === 'asc')
        {
          setSort({ key: col, direction: 'desc' })  
        } else {
          setSort({ key: '', direction: 'asc' })
        }
    } else {
      setSort({ key: col, direction: 'asc' });
    }
  }

  const sortIcon = (col: string) => {
    if(sort.key !== col) {
      return <FaSort onClick={() => sortToggle(col)} className="inline-block ml-2" />
    }
    return sort.direction === 'asc' ? <FaSortUp onClick={() => sortToggle(col)} className="inline-block ml-2" /> : <FaSortDown onClick={() => sortToggle(col)} className="inline-block ml-2" />
  }

  const normalizeSearchTerm = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const sortedRecords = useMemo(() => {
    if (!sort.key) return records
    else {
      const sorted = [...records].sort((a, b) => {
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
      return sorted
    }
  }, [records, sort])

  const filteredRecords = useMemo(() => {
    const query = normalizeSearchTerm(searchQuery)
    if (!query || query.length < searchMinChars) return sortedRecords

    return sortedRecords.filter(record => {
      return columns.some(col => {
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
    return records.filter((record) => record?.status !== 'archived').length
  }, [records])

  const visibleFilteredRecords = useMemo(() => {
    return filteredRecords.filter((record) => record?.status !== 'archived')
  }, [filteredRecords])

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

  const renderActionButtons = (record: Record<string, unknown>) => (
    <ActionRow>
      {entity === "EVENT" && (
        <ActionIconButton
          href={`/${entityTypeSlug}/${record.ksuid}/bundles`}
          label={`Manage Bundles for ${String(record.name)}`}
          icon={<LuPackage className='h-5 w-5' />}
        />
      )}
      {entity === "EVENT" && (
        <ActionIconButton
          href={`/${entityTypeSlug}/${record.ksuid}/tickets`}
          label={`Manage Tickets for ${String(record.name)}`}
          icon={<IoTicketOutline className='h-5 w-5' />}
        />
      )}
      {rowActions?.(record)}
      {showEditAction ? (
        <ActionIconButton
          href={parentKsuid && parentEntityName ? `/${parentEntityName}s/${parentKsuid}/${entityTypeSlug}/${record.ksuid}/edit` : `/${entityTypeSlug}/${record.ksuid || record.email}/edit`}
          label={`Edit ${String(record.name)}`}
          icon={<MdModeEdit className='h-5 w-5' />}
        />
      ) : null}
      {showDeleteAction && record.ksuid ? (
        <DestructiveButton className='text-white flex items-center justify-center gap-1 bg-keppel-on-light px-1.5 py-1.5 rounded z-0' record={record} onClick={handleDelete}>
          <MdDeleteOutline className='h-5 w-5'></MdDeleteOutline> <span className='sr-only'>Delete {String(record.name)}</span>
        </DestructiveButton>
      ) : null}
    </ActionRow>
  )


  return (
  <div className='w-full'>
    {/* {columns} */}
    <div className="mb-3 px-4 text-sm text-gray-600 sm:px-4 lg:px-8">{countCaption}</div>

    <div className="space-y-3 px-4 sm:px-4 lg:hidden">
      {visibleFilteredRecords.map((record) => {
        const startDateTime = toDateOrNull(getNestedValue(record, 'starts_at'))
        const endDateTime = toDateOrNull(getNestedValue(record, 'ends_at'))
        const shouldShowEndDate = !((startDateTime && endDateTime) ? isSameDay(startDateTime, endDateTime) : false)
        const startsAtIndex = columns.indexOf('starts_at')
        const endsAtIndex = columns.indexOf('ends_at')
        const dateTimeBlockIndex = showMobileEventDateTimeBlock
          ? Math.min(
              startsAtIndex >= 0 ? startsAtIndex : Number.MAX_SAFE_INTEGER,
              endsAtIndex >= 0 ? endsAtIndex : Number.MAX_SAFE_INTEGER,
            )
          : -1

        return (
          <article key={`mobile-${record.ksuid || record.email}`} className="space-y-3 rounded-lg border border-gray-200 bg-white px-3 py-3">
            {columns.map((col, colIdx) => {
              if (showMobileEventDateTimeBlock && (col === 'starts_at' || col === 'ends_at')) {
                if (colIdx !== dateTimeBlockIndex) {
                  return null
                }

                return (
                  <div key={`mobile-${record.ksuid || record.email}-date-time`} className="grid grid-cols-2 gap-3 rounded-md bg-gray-50 px-3 py-2">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Starts</dt>
                      <dd className="mt-1 text-sm font-semibold text-gray-900">{formatDatePart(startDateTime)}</dd>
                      <dd className="text-sm text-gray-700">{formatTimePart(startDateTime)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Ends</dt>
                      {shouldShowEndDate ? (
                        <dd className="mt-1 text-sm font-semibold text-gray-900">{formatDatePart(endDateTime)}</dd>
                      ) : null}
                      <dd className={`text-sm text-gray-700 ${shouldShowEndDate ? '' : 'mt-1'}`}>{formatTimePart(endDateTime)}</dd>
                    </div>
                  </div>
                )
              }

              const value = getNestedValue(record, col) || ''

              if (colIdx === 0) {
                return (
                  <div key={`mobile-${record.ksuid || record.email}-${col}-${colIdx}`} className="-mx-3 -mt-3 rounded-t-lg bg-dark-background/90 px-3 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-white/70">{labelFromSnake(col.replace('meta.', ''))}</dt>
                    <dd className="mt-1 text-base font-semibold text-white break-words">{getDisplayValue(col, value, record)}</dd>
                  </div>
                )
              }

              return (
                <div key={`mobile-${record.ksuid || record.email}-${col}-${colIdx}`} className="flex items-start justify-between gap-4 text-sm">
                  <dt className="min-w-0 shrink-0 text-xs font-medium uppercase tracking-wide text-gray-500">{labelFromSnake(col.replace('meta.', ''))}</dt>
                  <dd className="min-w-0 break-words text-right text-gray-900">{getDisplayValue(col, value, record)}</dd>
                </div>
              )
            })}

            {hasActionsColumn ? (
              <div className="border-t border-gray-100 pt-2">
                {renderActionButtons(record)}
              </div>
            ) : null}
          </article>
        )
      })}

      {visibleFilteredRecords.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
          <div className="flex flex-col items-center gap-3">
            <span>{emptyStateMessage}</span>
            {isFullyFilteredOut && onClearSearch ? (
              <button
                type="button"
                onClick={onClearSearch}
                className="rounded bg-keppel-on-light px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
              >
                Clear search
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>

    <div className="hidden lg:block">
      <div className="flow-root">
      <div className="relative">
        <div className="inline-block min-w-full py-0 align-middle">
          <table className="min-w-full divide-y divide-gray-300 " {...tableProps}>
            <caption className="sr-only">
              {countCaption}
            </caption>
            <thead className=''>
              <tr className='sticky top-16 z-10'>
                { columns.map((col,idx) => {
                                      
                  return <th key={`${columnKeys[idx]}-key`} scope="col" className={[(idx == 0 ? firstHeaderClasses + " grow" : restHeaderClasses), allHeaderClasses,"bg-dark-highlight/90  text-white"].join(' ')} >
                    {/* return <th key={`${col}-key`} scope="col" className="sticky top-0 z-10 border-b border-gray-300 bg-white/75 py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 backdrop-blur-sm backdrop-filter sm:pl-6 lg:pl-8"> */}
                    {labelFromSnake(col.replace('meta.',''))}
                    {sortIcon(col)}
                  </th>
                }) }
                {hasActionsColumn ? (
                  <th scope="col" className="py-3.5 pr-4 pl-3l sm:pr-6 lg:pr-8 bg-dark-highlight/90 text-white">
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {groupedVisibleRecords.map((group,idx)=>{
                return (
                  <Fragment key={`group-${idx}`}>
                    <tr data-key={`group-${idx}`}>
                      <td colSpan={columns.length + (hasActionsColumn ? 1 : 0)} className="py-1 bg-dark-outline/10 pr-3 pl-4 sm:pl-4 lg:pl-8"><h2 className='text-sm font-bold'>{nameFromHypenated(String(group[0] || "Unsaved Changes"))}</h2></td></tr>
                      {group[1].map((record)=>{
                        return <tr key={`${record.ksuid || record.email}`}>
                          {
                            columns.map((col,idx)=>{
                              const value = getNestedValue(record, col) || ''
                              return <td key={`${record.ksuid || record.email }-${columnKeys[idx]}`} className={[(idx == 0 ? firstHeaderClasses + " grow" : restHeaderClasses), allHeaderClasses].join(' ')}>
                                {getDisplayValue(col, value, record)}
                              </td>
                            })
                          }
                          {hasActionsColumn ? (
                            <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6 lg:pr-8">
                              {renderActionButtons(record)}
                            </td>
                          ) : null}
                    </tr>
                  })}   
                  </Fragment>
                )
              })}
              {visibleFilteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (hasActionsColumn ? 1 : 0)}
                    className="px-4 py-6 text-center text-sm text-gray-500 sm:px-4 lg:px-8"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <span>{emptyStateMessage}</span>
                      {isFullyFilteredOut && onClearSearch ? (
                        <button
                          type="button"
                          onClick={onClearSearch}
                          className="rounded bg-keppel-on-light px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                        >
                          Clear search
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : null}
              
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  </div>
  )
}

export default BasicList
