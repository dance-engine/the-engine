export const deDupKeys = (keys: string[]) => {
  const countMap = new Map();

  return keys.map(item => {
    const count = countMap.get(item) || 0;
    countMap.set(item, count + 1);

    return count === 0 ? item : `${item}_${count + 1}`;
  });
}


export const groupByToArray = <T, K extends string | number | symbol>(
  array: T[],
  getKey: (item: T) => K
): [K, T[]][] => {
  const grouped = array.reduce((acc, item) => {
    const key = getKey(item)
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<K, T[]>)

  return Object.entries(grouped) as [K, T[]][]
}

export const getNestedValue = (
  obj: Record<string, unknown>,
  path: string
): string | number | symbol => {
  const raw = path.split('.').reduce<unknown>((acc, key) =>
    acc && typeof acc === 'object' && key in acc ? (acc as Record<string, unknown>)[key] : undefined,
    obj
  )

  if (raw === undefined || raw === null) return ""
  if (Array.isArray(raw)) { return raw.join(', ') }
  if (typeof raw === 'boolean') return JSON.stringify(raw)
  if (typeof raw === 'string' || typeof raw === 'number') return raw
  return ""
}
