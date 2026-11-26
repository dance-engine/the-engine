import { redirect } from "next/navigation";

// The theme editor moved to its own menu section.
const OrgThemeRedirect = () => redirect("/theme");

export default OrgThemeRedirect;
