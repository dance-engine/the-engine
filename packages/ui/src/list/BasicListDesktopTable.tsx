import { Fragment } from 'react/jsx-runtime'
import { getNestedValue } from '@dance-engine/utils/arrayHelpers'
import { labelFromSnake, nameFromHypenated } from '@dance-engine/utils/textHelpers'
import BasicListEmptyState from './BasicListEmptyState'
import BasicListRowActions from './BasicListRowActions'

type BasicListDesktopTableProps = {
  columns: string[]
  columnKeys: string[]
  firstHeaderClasses: string
  restHeaderClasses: string
  allHeaderClasses: string
  hasActionsColumn: boolean
  countCaption: string
  groupedVisibleRecords: [unknown, Record<string, unknown>[]][]
  visibleFilteredRecords: Record<string, unknown>[]
  getDisplayValue: (col: string, value: unknown, record: Record<string, unknown>) => React.ReactNode
  sortIcon: (col: string) => React.ReactNode
  entity: string
  entityTypeSlug: string
  parentKsuid?: string
  parentEntityName?: string
  showEditAction: boolean
  showDeleteAction: boolean
  rowActions?: (record: Record<string, unknown>) => React.ReactNode
  onDelete: (record: Record<string, unknown>) => void | Promise<void>
  emptyStateMessage: string
  isFullyFilteredOut: boolean
  onClearSearch?: () => void
  tableProps: React.HTMLAttributes<HTMLTableElement>
}

const BasicListDesktopTable: React.FC<BasicListDesktopTableProps> = ({
  columns,
  columnKeys,
  firstHeaderClasses,
  restHeaderClasses,
  allHeaderClasses,
  hasActionsColumn,
  countCaption,
  groupedVisibleRecords,
  visibleFilteredRecords,
  getDisplayValue,
  sortIcon,
  entity,
  entityTypeSlug,
  parentKsuid,
  parentEntityName,
  showEditAction,
  showDeleteAction,
  rowActions,
  onDelete,
  emptyStateMessage,
  isFullyFilteredOut,
  onClearSearch,
  tableProps,
}) => {
  return (
    <div className="hidden lg:block">
      <div className="flow-root">
        <div className="relative">
          <div className="inline-block min-w-full py-0 align-middle">
            <table className="min-w-full divide-y divide-gray-300 " {...tableProps}>
              <caption className="sr-only">{countCaption}</caption>
              <thead className="">
                <tr className="sticky top-16 z-10">
                  {columns.map((col, idx) => {
                    return (
                      <th
                        key={`${columnKeys[idx]}-key`}
                        scope="col"
                        className={[
                          idx === 0 ? `${firstHeaderClasses} grow` : restHeaderClasses,
                          allHeaderClasses,
                          'bg-dark-highlight/90  text-white',
                        ].join(' ')}
                      >
                        {labelFromSnake(col.replace('meta.', ''))}
                        {sortIcon(col)}
                      </th>
                    )
                  })}
                  {hasActionsColumn ? (
                    <th scope="col" className="py-3.5 pr-4 pl-3l sm:pr-6 lg:pr-8 bg-dark-highlight/90 text-white">
                      <span className="sr-only">Actions</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {groupedVisibleRecords.map((group, idx) => {
                  return (
                    <Fragment key={`group-${idx}`}>
                      <tr data-key={`group-${idx}`}>
                        <td colSpan={columns.length + (hasActionsColumn ? 1 : 0)} className="py-1 bg-dark-outline/10 pr-3 pl-4 sm:pl-4 lg:pl-8">
                          <h2 className="text-sm font-bold">{nameFromHypenated(String(group[0] || 'Unsaved Changes'))}</h2>
                        </td>
                      </tr>
                      {group[1].map((record) => {
                        return (
                          <tr key={`${record.ksuid || record.email}`}>
                            {columns.map((col, colIdx) => {
                              const value = getNestedValue(record, col) || ''
                              return (
                                <td
                                  key={`${record.ksuid || record.email}-${columnKeys[colIdx]}`}
                                  className={[
                                    colIdx === 0 ? `${firstHeaderClasses} grow` : restHeaderClasses,
                                    allHeaderClasses,
                                  ].join(' ')}
                                >
                                  {getDisplayValue(col, value, record)}
                                </td>
                              )
                            })}
                            {hasActionsColumn ? (
                              <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6 lg:pr-8">
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
                              </td>
                            ) : null}
                          </tr>
                        )
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
                      <BasicListEmptyState
                        emptyStateMessage={emptyStateMessage}
                        isFullyFilteredOut={isFullyFilteredOut}
                        onClearSearch={onClearSearch}
                      />
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

export default BasicListDesktopTable
