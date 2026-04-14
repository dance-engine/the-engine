import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import SuperAdminUserManagement from "../../components/SuperAdminUserManagement";

type UserOrganisations = Record<string, string[]>;

const SettingsUsersPage = async () => {
  const user = await currentUser();
  const organisations = user?.publicMetadata?.organisations as
    | UserOrganisations
    | undefined;
  const isSuperAdmin =
    Object.prototype.hasOwnProperty.call(organisations ?? {}, "*") &&
    (!Array.isArray(organisations?.["*"]) ||
      organisations["*"].length === 0 ||
      organisations["*"].includes("*") ||
      organisations["*"].includes("superadmin"));

  if (!isSuperAdmin) {
    notFound();
  }

  return (
    <div className="w-full px-4 lg:px-8">
      <SuperAdminUserManagement />
    </div>
  );
};

export default SettingsUsersPage;
