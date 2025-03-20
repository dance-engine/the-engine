export type BasicListProps<T extends Record<string, any> = {}> = {
  columns: string[];
  records: Record<string, string | number | boolean | null>[];
} & T;