import ActionIconButton from '../actions/ActionIconButton'
import ActionRow from '../actions/ActionRow'
import DestructiveButton from '../general/DestructiveButton'
import { MdDeleteForever, MdImage, MdInventory2, MdModeEdit } from 'react-icons/md'
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
  destructiveActionLabel?: string
  rowActions?: (record: Record<string, unknown>) => React.ReactNode
  onDelete: (record: Record<string, unknown>) => void | Promise<void>
}

const BasicListRowActions: React.FC<BasicListRowActionsProps> = ({
  entity,
  entityTypeSlug,
  record,
  parentKsuid,
  parentEntityName,
  showEditAction,
  showDeleteAction,
  destructiveActionLabel = 'Archive',
  rowActions,
  onDelete,
}) => {
  const destructiveIcon = destructiveActionLabel === 'Delete' ? <MdDeleteForever className='h-5 w-5' /> : <MdInventory2 className='h-5 w-5' />

  return (
    <ActionRow>
      {entity === 'EVENT' && (
        <ActionIconButton
          href={`/${entityTypeSlug}/${record.ksuid}/bundles`}
          label={`Manage Bundles`}
          record_label={` for ${String(record.name)}`}
          icon={<LuPackage className='h-5 w-5' />}
        />
      )}
      {entity === 'EVENT' && (
        <ActionIconButton
          href={`/${entityTypeSlug}/${record.ksuid}/tickets`}
          label={`Manage Tickets`}
          record_label={` for ${String(record.name)}`}
          icon={<IoTicketOutline className='h-5 w-5' />}
        />
      )}
      {rowActions?.(record)}
      {showEditAction ? (
        <ActionIconButton
          href={parentKsuid && parentEntityName ? `/${parentEntityName}s/${parentKsuid}/${entityTypeSlug}/${record.ksuid}/edit` : `/${entityTypeSlug}/${record.ksuid || record.email}/edit`}
          label={`Edit details`}
          record_label={` for ${String(record.name)}`}
          icon={<MdModeEdit className='h-5 w-5' />}
        />
      ) : null}
      {entity === 'EVENT' && record.ksuid ? (
        <ActionIconButton
          href={`/media/${record.ksuid}`}
          label={`Manage Media`}
          record_label={` for ${String(record.name)}`}
          icon={<MdImage className='h-5 w-5' />}
        />
      ) : null}
      {showDeleteAction && record.ksuid ? (
        <DestructiveButton
          className='text-white flex items-center justify-center gap-1 bg-keppel-on-light px-1.5 py-1.5 rounded z-0'
          record={record}
          onClick={onDelete}
        >
          {destructiveIcon}{' '}
          <span className='text-xs font-medium leading-none lg:sr-only'>{destructiveActionLabel} <span className='sr-only'>{String(record.name)}</span></span>
        </DestructiveButton>
      ) : null}
    </ActionRow>
  )
}

export default BasicListRowActions
