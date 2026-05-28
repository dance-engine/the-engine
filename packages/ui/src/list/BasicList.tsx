'use client'
import { useMemo, useState } from 'react'
import { eventMetadata } from '@dance-engine/schemas/events'
import { BasicListProps } from '@dance-engine/ui/types' 
import { deDupKeys } from '@dance-engine/utils/arrayHelpers'
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { BasicListSort, useBasicListRecords } from './useBasicListRecords'
import BasicListMobileCards from './BasicListMobileCards'
import BasicListDesktopTable from './BasicListDesktopTable'
import { useArchiveEntityRecord } from './useArchiveEntityRecord'
import { useDeleteEntityRecord } from './useDeleteEntityRecord'
import {
  formatDatePart,
  formatTimePart,
  getDisplayValue,
  toDateOrNull,
} from './BasicListDisplayHelpers'

const BasicList: React.FC<BasicListProps<React.HTMLAttributes<HTMLTableElement>>> = ({
  entity,
  columns,
  formats,
  records,
  includeArchived = false,
  archivedOnly = false,
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
  const [sort, setSort] = useState<BasicListSort>({ key: '', direction: 'asc' });
  const [optimisticallyArchivedKeys, setOptimisticallyArchivedKeys] = useState<Set<string>>(new Set())
  const [optimisticallyDeletedKeys, setOptimisticallyDeletedKeys] = useState<Set<string>>(new Set())

  const { archiveRecord } = useArchiveEntityRecord({ entity, activeOrg })
  const { deleteRecord } = useDeleteEntityRecord({ entity, activeOrg })
  const entityTypeSlug = `${entity?.toLowerCase()}s`
  const destructiveActionLabel = entity === 'EVENT' && archivedOnly ? 'Delete' : 'Archive'
  const firstHeaderClasses = "pr-3 pl-4 sm:pl-4 lg:pl-8"
  const restHeaderClasses = "px-3"
  const allHeaderClasses = "py-3.5 text-left text-sm font-semibold text-gray-900"
  const columnKeys = deDupKeys(columns)
  const hasActionsColumn = entity === "EVENT" || showEditAction || showDeleteAction || Boolean(rowActions)
  const showMobileEventDateTimeBlock = entity === 'EVENT' && columns.includes('starts_at') && columns.includes('ends_at')
  const metadataByEntity: Partial<Record<string, Record<string, unknown>>> = {
    EVENT: eventMetadata as Record<string, unknown>,
  }

  const displayValue = (col: string, value: unknown, record: Record<string, unknown>) => {
    return getDisplayValue({
      col,
      value,
      record,
      columnValueAdapters,
      columns,
      formats: formats as string[] | undefined,
      metadataByEntity,
      entity,
    })
  }

  const getRecordKey = (record: Record<string, unknown>) => {
    const ksuid = record?.ksuid
    if (typeof ksuid === 'string' && ksuid.length > 0) return ksuid

    const email = record?.email
    if (typeof email === 'string' && email.length > 0) return email

    return ''
  }

  const optimisticRecords = useMemo(() => {
    if (optimisticallyArchivedKeys.size === 0 && optimisticallyDeletedKeys.size === 0) return records

    return records
      .filter((record) => {
        const key = getRecordKey(record)
        if (!key) return true

        return !optimisticallyDeletedKeys.has(key)
      })
      .map((record) => {
      const key = getRecordKey(record)
      if (!key || !optimisticallyArchivedKeys.has(key)) return record

      return {
        ...record,
        status: 'archived',
      }
      })
  }, [records, optimisticallyArchivedKeys, optimisticallyDeletedKeys])

  const shouldHardDelete = entity === 'EVENT' && archivedOnly

  const handleDelete = async (record: Record<string, unknown>) => {
    const key = getRecordKey(record)

    if (key) {
      setOptimisticallyDeletedKeys((previousKeys) => {
        if (previousKeys.has(key)) return previousKeys
        const nextKeys = new Set(previousKeys)
        nextKeys.add(key)
        return nextKeys
      })
    }

    const result = shouldHardDelete ? await deleteRecord(record) : await archiveRecord(record)
    if (result.ok) return

    if (key) {
      setOptimisticallyDeletedKeys((previousKeys) => {
        if (!previousKeys.has(key)) return previousKeys
        const nextKeys = new Set(previousKeys)
        nextKeys.delete(key)
        return nextKeys
      })
    }

    if (result.error) {
      console.error(result.error)
    }
  }

  const handleArchive = async (record: Record<string, unknown>) => {
    const key = getRecordKey(record)

    if (key) {
      setOptimisticallyArchivedKeys((previousKeys) => {
        if (previousKeys.has(key)) return previousKeys
        const nextKeys = new Set(previousKeys)
        nextKeys.add(key)
        return nextKeys
      })
    }

    const result = await archiveRecord(record)
    if (result.ok) return

    if (key) {
      setOptimisticallyArchivedKeys((previousKeys) => {
        if (!previousKeys.has(key)) return previousKeys
        const nextKeys = new Set(previousKeys)
        nextKeys.delete(key)
        return nextKeys
      })
    }

    if (result.error) {
      console.error(result.error)
    }
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

  const {
    visibleFilteredRecords,
    groupedVisibleRecords,
    isFullyFilteredOut,
    countCaption,
    emptyStateMessage,
  } = useBasicListRecords({
    records: optimisticRecords,
    sort,
    columns,
    columnValueAdapters,
    searchQuery,
    searchMinChars,
    entity,
    includeArchived,
    archivedOnly,
  })


  return (
  <div className='w-full'>
    {/* {columns} */}
    <div className="mb-3 px-4 text-sm text-gray-600 sm:px-4 lg:px-8">{countCaption}</div>

    <BasicListMobileCards
      entity={entity}
      columns={columns}
      visibleFilteredRecords={visibleFilteredRecords}
      hasActionsColumn={hasActionsColumn}
      showMobileEventDateTimeBlock={showMobileEventDateTimeBlock}
      entityTypeSlug={entityTypeSlug}
      parentKsuid={parentKsuid}
      parentEntityName={parentEntityName}
      showEditAction={showEditAction}
      showDeleteAction={showDeleteAction}
      destructiveActionLabel={destructiveActionLabel}
      rowActions={rowActions}
      onDelete={handleDelete}
      getDisplayValue={displayValue}
      toDateOrNull={toDateOrNull}
      formatDatePart={formatDatePart}
      formatTimePart={formatTimePart}
      emptyStateMessage={emptyStateMessage}
      isFullyFilteredOut={isFullyFilteredOut}
      onClearSearch={onClearSearch}
    />

    <BasicListDesktopTable
      columns={columns}
      columnKeys={columnKeys}
      firstHeaderClasses={firstHeaderClasses}
      restHeaderClasses={restHeaderClasses}
      allHeaderClasses={allHeaderClasses}
      hasActionsColumn={hasActionsColumn}
      countCaption={countCaption}
      groupedVisibleRecords={groupedVisibleRecords as [unknown, Record<string, unknown>[]][]}
      visibleFilteredRecords={visibleFilteredRecords}
      getDisplayValue={displayValue}
      sortIcon={sortIcon}
      entity={entity}
      entityTypeSlug={entityTypeSlug}
      parentKsuid={parentKsuid}
      parentEntityName={parentEntityName}
      showEditAction={showEditAction}
      showDeleteAction={showDeleteAction}
      destructiveActionLabel={destructiveActionLabel}
      rowActions={rowActions}
      onDelete={handleDelete}
      emptyStateMessage={emptyStateMessage}
      isFullyFilteredOut={isFullyFilteredOut}
      onClearSearch={onClearSearch}
      tableProps={tableProps}
    />
  </div>
  )
}

export default BasicList
