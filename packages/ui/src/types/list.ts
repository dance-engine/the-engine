import { ReactNode } from "react";

export type BasicListProps<T extends Record<string, any> = {}> = {
  entity: string,
  columns: string[];
  formats?: (string | undefined)[]; 
  records: Record<string, unknown>[];
  activeOrg?: string;
  parentKsuid?: string; // For nested resources like bundles within events
  parentEntityName?: string; // The parent entity name (e.g., "event" for bundles within events)
  showEditAction?: boolean;
  showDeleteAction?: boolean;
  rowActions?: (record: Record<string, unknown>) => ReactNode;
} & T;
