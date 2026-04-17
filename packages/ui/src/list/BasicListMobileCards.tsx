import { isSameDay } from 'date-fns'
import { getNestedValue } from '@dance-engine/utils/arrayHelpers'
import { labelFromSnake } from '@dance-engine/utils/textHelpers'
import BasicListEmptyState from './BasicListEmptyState'
import BasicListRowActions from './BasicListRowActions'

type BasicListMobileCardsProps = {
  entity: string
  columns: string[]
  visibleFilteredRecords: Record<string, unknown>[]
  hasActionsColumn: boolean
  showMobileEventDateTimeBlock: boolean
  entityTypeSlug: string
  parentKsuid?: string
  parentEntityName?: string
  showEditAction: boolean
  showDeleteAction: boolean
  rowActions?: (record: Record<string, unknown>) => React.ReactNode
  onDelete: (record: Record<string, unknown>) => void | Promise<void>
  getDisplayValue: (col: string, value: unknown, record: Record<string, unknown>) => React.ReactNode
  toDateOrNull: (value: unknown) => Date | null
  formatDatePart: (value: Date | null) => string
  formatTimePart: (value: Date | null) => string
  emptyStateMessage: string
  isFullyFilteredOut: boolean
  onClearSearch?: () => void
}

const BasicListMobileCards: React.FC<BasicListMobileCardsProps> = ({
  entity,
  columns,
  visibleFilteredRecords,
  hasActionsColumn,
  showMobileEventDateTimeBlock,
  entityTypeSlug,
  parentKsuid,
  parentEntityName,
  showEditAction,
  showDeleteAction,
  rowActions,
  onDelete,
  getDisplayValue,
  toDateOrNull,
  formatDatePart,
  formatTimePart,
  emptyStateMessage,
  isFullyFilteredOut,
  onClearSearch,
}) => {
  return (
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
              <div className="-mx-3 -mb-3 rounded-b-lg border-t border-keppel-on-light/20 bg-keppel-on-light/10 px-3 py-2">
                <BasicListRowActions
                  entity={entity}
                  entityTypeSlug={entityTypeSlug}
                  record={record}
                  parentKsuid={parentKsuid}
                  parentEntityName={parentEntityName}
                  showEditAction={showEditAction}
                  showDeleteAction={showDeleteAction}
                  rowActions={rowActions}
                  onDelete={onDelete}
                />
              </div>
            ) : null}
          </article>
        )
      })}

      {visibleFilteredRecords.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
          <BasicListEmptyState
            emptyStateMessage={emptyStateMessage}
            isFullyFilteredOut={isFullyFilteredOut}
            onClearSearch={onClearSearch}
          />
        </div>
      ) : null}
    </div>
  )
}

export default BasicListMobileCards
