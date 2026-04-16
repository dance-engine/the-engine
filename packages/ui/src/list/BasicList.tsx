'use client'
import Link from 'next/link'
import { Fragment } from 'react/jsx-runtime'
import { useMemo, useState } from 'react'
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

  const getDisplayValue = (col: string, value: unknown, record: Record<string, unknown>) => {
    const adapter = columnValueAdapters?.[col]
    if (adapter?.displayValue) {
      return adapter.displayValue(value, record)
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


  return (
  <div className='w-full'>
    {/* {columns} */}
    <div className=" flow-root ">
      <div className="relative">
        <div className="inline-block min-w-full py-0 align-middle">
          <table className="min-w-full divide-y divide-gray-300 " {...tableProps}>
            <caption className="caption-top px-4 py-2 text-left text-sm text-gray-600 sm:px-4 lg:px-8">
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
  )
}

export default BasicList
