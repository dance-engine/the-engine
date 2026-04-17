import { format } from 'date-fns'
import { BasicListColumnValueAdapter } from '@dance-engine/ui/types'
import { labelFromSnake, formatField } from '@dance-engine/utils/textHelpers'

type EntityMetadata = Partial<Record<string, Record<string, unknown>>>

type DisplayValueParams = {
  col: string
  value: unknown
  record: Record<string, unknown>
  columnValueAdapters?: Record<string, BasicListColumnValueAdapter>
  columns: string[]
  formats?: Array<string | undefined>
  metadataByEntity: EntityMetadata
  entity: string
}

export const getColumnMetadata = (
  metadataByEntity: EntityMetadata,
  entity: string,
  col: string,
) => {
  const entityMetadata = metadataByEntity[entity]
  if (!entityMetadata) return undefined

  return col.split('.').reduce<unknown>((meta, segment) => {
    if (!meta || typeof meta !== 'object') return undefined
    return (meta as Record<string, unknown>)[segment]
  }, entityMetadata)
}

export const getCheckboxValues = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }

  return []
}

export const toDateOrNull = (value: unknown): Date | null => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDatePart = (value: Date | null) => {
  if (!value) return '-'
  return format(value, 'dd MMM yyyy')
}

export const formatTimePart = (value: Date | null) => {
  if (!value) return '-'
  return format(value, 'HH:mm')
}

export const getDisplayValue = ({
  col,
  value,
  record,
  columnValueAdapters,
  columns,
  formats,
  metadataByEntity,
  entity,
}: DisplayValueParams) => {
  const adapter = columnValueAdapters?.[col]
  if (adapter?.displayValue) {
    return adapter.displayValue(value, record)
  }

  const columnMetadata = getColumnMetadata(metadataByEntity, entity, col) as
    | { checkboxesField?: boolean }
    | undefined

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

  return formatField(String(value || ''), formats?.[columns.indexOf(col)]) || '-'
}
