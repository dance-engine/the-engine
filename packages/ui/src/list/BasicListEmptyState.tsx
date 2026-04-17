type BasicListEmptyStateProps = {
  emptyStateMessage: string
  isFullyFilteredOut: boolean
  onClearSearch?: () => void
}

const BasicListEmptyState: React.FC<BasicListEmptyStateProps> = ({
  emptyStateMessage,
  isFullyFilteredOut,
  onClearSearch,
}) => {
  return (
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
  )
}

export default BasicListEmptyState
