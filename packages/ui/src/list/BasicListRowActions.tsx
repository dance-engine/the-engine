import ActionIconButton from '../actions/ActionIconButton'
import ActionRow from '../actions/ActionRow'
import DestructiveButton from '../general/DestructiveButton'
import { MdDeleteOutline, MdModeEdit } from 'react-icons/md'
import { LuPackage } from 'react-icons/lu'
import { IoTicketOutline } from 'react-icons/io5'

type BasicListRowActionsProps = {
  entity: string
  entityTypeSlug: string
  record: Record<string, unknown>
  parentKsuid?: string
  parentEntityName?: string
  showEditAction: boolean
  showDeleteAction: boolean
  rowActions?: (record: Record<string, unknown>) => React.ReactNode
  onDelete: (record: Record<string, unknown>) => void
}

const BasicListRowActions: React.FC<BasicListRowActionsProps> = ({
  entity,
  entityTypeSlug,
  record,
  parentKsuid,
  parentEntityName,
  showEditAction,
  showDeleteAction,
  rowActions,
  onDelete,
}) => {
  return (
    <ActionRow>
      {entity === 'EVENT' && (
        <ActionIconButton
          href={`/${entityTypeSlug}/${record.ksuid}/bundles`}
          label={`Manage Bundles for ${String(record.name)}`}
          icon={<LuPackage className='h-5 w-5' />}
        />
      )}
      {entity === 'EVENT' && (
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
        <DestructiveButton
          className='text-white flex items-center justify-center gap-1 bg-keppel-on-light px-1.5 py-1.5 rounded z-0'
          record={record}
          onClick={onDelete}
        >
          <MdDeleteOutline className='h-5 w-5'></MdDeleteOutline>{' '}
          <span className='sr-only'>Delete {String(record.name)}</span>
        </DestructiveButton>
      ) : null}
    </ActionRow>
  )
}

export default BasicListRowActions
