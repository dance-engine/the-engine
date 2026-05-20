import { useState, useMemo } from 'react'
import SearchableEntityPicker from '../components/SearchableEntityPicker'

export default function MediaEventSearchBox({ events, onSelect }: { events: any[], onSelect: (ksuid: string) => void }) {
  const [query, setQuery] = useState('')
  const options = useMemo(() => events.map(event => ({
    key: event.ksuid,
    title: event.name,
    subtitle: event.status,
    value: event.ksuid,
    searchText: event.name + ' ' + (event.status || '')
  })), [events])

  return (
    <SearchableEntityPicker
      label="Search events"
      placeholder="Type to search events..."
      value={query}
      options={options}
      onValueChange={setQuery}
      onSelect={opt => onSelect(opt.value)}
      emptyMessage="No events found."
      minChars={2}
    />
  )
}
