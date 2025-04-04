export type BasicListProps<T extends Record<string, any> = {}> = {
  columns: string[];
  formats?: (string | undefined)[]; 
  records: Record<string, unknown>[];
} & T;