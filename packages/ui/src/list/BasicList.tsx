'use client'
import { useState } from 'react'
import { eventMetadata } from '@dance-engine/schemas/events'
import { BasicListProps } from '@dance-engine/ui/types' 
import { deDupKeys } from '@dance-engine/utils/arrayHelpers'
import { useAuth } from '@clerk/nextjs'
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { BasicListSort, useBasicListRecords } from './useBasicListRecords'
import BasicListMobileCards from './BasicListMobileCards'
import BasicListDesktopTable from './BasicListDesktopTable'
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

  const {
    visibleFilteredRecords,
    groupedVisibleRecords,
    isFullyFilteredOut,
    countCaption,
    emptyStateMessage,
  } = useBasicListRecords({
    records,
    sort,
    columns,
    columnValueAdapters,
    searchQuery,
    searchMinChars,
    entity,
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
