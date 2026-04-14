export const isSuperAdmin = (publicMetadata: unknown): boolean => {
  if (!publicMetadata || typeof publicMetadata !== "object") {
    return false;
  }

  const metadata = publicMetadata as Record<string, unknown>;
  const adminFlags = Array.isArray(metadata.admin)
    ? metadata.admin.filter((value): value is string => typeof value === "string")
    : [];
  const organisations =
    metadata.organisations && typeof metadata.organisations === "object"
      ? (metadata.organisations as Record<string, unknown>)
      : {};

  return (
    adminFlags.includes("superadmin") ||
    adminFlags.includes("*") ||
    Object.keys(organisations).includes("*")
  );
};
