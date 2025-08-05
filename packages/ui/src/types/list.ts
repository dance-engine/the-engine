export type BasicListProps<T extends Record<string, any> = {}> = {
  entity: string,
  columns: string[];
  formats?: (string | undefined)[]; 
  records: Record<string, unknown>[];
  activeOrg?: string;
} & T;