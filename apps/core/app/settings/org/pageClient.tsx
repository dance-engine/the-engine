"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import DynamicForm from "@dance-engine/ui/form/DynamicForm";
import {
  organisationSchema,
  organisationMetadata,
} from "@dance-engine/schemas/organisation";
import { FieldValues } from "react-hook-form";
import { useOrgContext } from "@dance-engine/utils/OrgContext";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import useClerkSWR from "@dance-engine/utils/clerkSWR";
import { useEffect, useMemo, useState } from "react";
import { labelFromSnake } from "@dance-engine/utils/textHelpers";
import { DanceEngineEntity } from "@dance-engine/ui/types";

type OrgEntity = DanceEngineEntity & {
  theme?: Record<string, unknown>;
  [key: string]: unknown;
};

type SectionConfig = {
  key: "details" | "branding" | "theme" | "system";
  title: string;
  description: string;
  fields: string[];
  editable?: boolean;
  editLabel?: string;
  href?: string;
  linkLabel?: string;
};

const detailFields = [
  "name",
  "description",
  "organisation",
  "status",
  "account_id",
] as const;
const brandingFields = [
  "banner",
  "banner_overlay",
  "logo",
  "logo_secondary_url",
  "logo_icon_url",
] as const;
const systemFields = ["created_at", "updated_at", "version"] as const;
const themeFields = [
  "colour_primary",
  "colour_secondary",
  "colour_background",
  "colour_background_alt",
  "colour_surface_light",
  "colour_surface_dark",
  "css_vars",
] as const;

const editableBaseFields = [
  ...detailFields,
  ...brandingFields,
  ...systemFields,
] as const;

const sections: SectionConfig[] = [
  {
    key: "details",
    title: "Organisation Details",
    description: "Core information about the organisation itself.",
    fields: [...detailFields],
    editable: true,
    editLabel: "Edit details",
  },
  {
    key: "branding",
    title: "Brand Assets",
    description: "Images and visual assets used across the product.",
    fields: [...brandingFields],
    editable: true,
    editLabel: "Edit assets",
  },
  {
    key: "theme",
    title: "Theme",
    description:
      "Theme tokens are stored separately and edited on their own page.",
    fields: [...themeFields],
    href: "/settings/org/theme",
    linkLabel: "Edit theme",
  },
  {
    key: "system",
    title: "System",
    description: "Read-only metadata for this organisation record.",
    fields: [...systemFields],
  },
];

const detailSchema = organisationSchema.pick({
  name: true,
  description: true,
  organisation: true,
  status: true,
  account_id: true,
});

const brandingSchema = organisationSchema.pick({
  banner: true,
  banner_overlay: true,
  logo: true,
  logo_secondary_url: true,
  logo_icon_url: true,
});

const sectionSchemas = {
  details: detailSchema,
  branding: brandingSchema,
};

const sectionMetadata = {
  details: {
    description: organisationMetadata.description,
    organisation: organisationMetadata.organisation,
    account_id: organisationMetadata.account_id,
  },
  branding: {
    banner: organisationMetadata.banner,
    banner_overlay: organisationMetadata.banner_overlay,
    logo: organisationMetadata.logo,
    logo_secondary_url: organisationMetadata.logo_secondary_url,
    logo_icon_url: organisationMetadata.logo_icon_url,
  },
};

const isImageField = (field: string) =>
  field === "banner" || field.includes("logo");

const formatFieldValue = (field: string, value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return <span className="text-gray-400">Not set</span>;
  }

  if (
    typeof value === "string" &&
    (field === "created_at" || field === "updated_at")
  ) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString();
    }
  }

  if (field === "css_vars" && typeof value === "string") {
    return (
      <pre className="whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-xs text-gray-700">
        {value}
      </pre>
    );
  }

  if (typeof value === "string" && value.startsWith("http")) {
    return (
      <div className="space-y-3">
        {isImageField(field) ? (
          <img
            src={value}
            alt={labelFromSnake(field)}
            className="max-h-32 rounded-md border border-gray-200 object-contain"
          />
        ) : null}
        <Link
          href={value}
          target="_blank"
          className="text-sm text-blue-600 underline underline-offset-2 break-all"
        >
          Link to asset
        </Link>
      </div>
    );
  }

  if (field === "description" && typeof value === "string") {
    return (
      <div
        className="prose prose-sm max-w-none text-gray-900"
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  return <span className="text-gray-900 break-words">{String(value)}</span>;
};

const getBaseOrganisationPayload = (
  entity: OrgEntity,
  updates: FieldValues,
) => {
  const mergedEntity = {
    ...entity,
    ...updates,
  };

  return editableBaseFields.reduce<Record<string, unknown>>(
    (payload, field) => {
      const value = mergedEntity[field];
      if (value !== undefined) {
        payload[field] = value;
      }
      return payload;
    },
    {},
  );
};

const SettingsSection = ({
  section,
  values,
  isEditing,
  onEdit,
  onCancel,
  children,
}: {
  section: SectionConfig;
  values: Record<string, unknown>;
  isEditing: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  children?: ReactNode;
}) => (
  <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
    <div className="flex flex-col gap-4 border-b border-gray-200 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          {section.title}
        </h2>
        <p className="mt-1 text-sm text-gray-700">{section.description}</p>
      </div>
      {section.editable ? (
        isEditing ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md bg-dark-background px-3 py-2 text-sm font-semibold text-white hover:bg-dark-highlight"
          >
            {section.editLabel || "Edit"}
          </button>
        )
      ) : section.href ? (
        <Link
          href={section.href}
          className="rounded-md bg-dark-background px-3 py-2 text-sm font-semibold text-white hover:bg-dark-highlight"
        >
          {section.linkLabel || "Open"}
        </Link>
      ) : null}
    </div>

    {isEditing ? (
      <div className="px-4 py-4 sm:px-6">{children}</div>
    ) : (
      <dl className="divide-y divide-gray-200">
        {section.fields.map((field) => (
          <div
            key={field}
            className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
          >
            <dt className="text-sm font-medium text-gray-700">
              {labelFromSnake(field)}
            </dt>
            <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">
              {formatFieldValue(field, values[field])}
            </dd>
          </div>
        ))}
      </dl>
    )}
  </section>
);

const OrgPageClient = ({ ksuid }: { ksuid?: string }) => {
  const router = useRouter();
  const { activeOrg } = useOrgContext();
  const { getToken } = useAuth();

  const baseUrlEndpoint =
    `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/settings`.replace(
      "/{org}",
      `/${activeOrg || "demo"}`,
    );
  const defaultEntity = useMemo(
    () => ({ entity_type: "ORGANISATION", activeOrg }),
    [activeOrg],
  );
  const { data, error, isLoading } = useClerkSWR(baseUrlEndpoint);

  const [entity, setEntity] = useState<OrgEntity>({ ksuid: "" } as OrgEntity);
  const [editingSection, setEditingSection] = useState<
    SectionConfig["key"] | null
  >(null);

  const handleSubmit = async (formData: FieldValues) => {
    const { _meta, ...cleanedData } = formData;
    const organisationPayload = getBaseOrganisationPayload(entity, cleanedData);
    const storageKey = `${activeOrg}:ORGANISATION#${activeOrg}`;

    try {
      const res = await fetch(baseUrlEndpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`,
        },
        body: JSON.stringify({ organisation: organisationPayload }),
      });

      const result = await res.json();
      const previousCache = JSON.parse(
        localStorage.getItem(storageKey) || "{}",
      );

      if (!res.ok) {
        const failedCache = JSON.stringify({
          ...previousCache,
          ...organisationPayload,
          meta: { saved: "failed", updated_at: new Date().toISOString() },
        });
        localStorage.setItem(storageKey, failedCache);
        throw new Error(result.message || "Something went wrong");
      }

      const savedData = {
        ...entity,
        ...organisationPayload,
        version: Number(result.organisation.version) + 1,
        meta: { saved: "saved", updated_at: new Date().toISOString() },
      };

      localStorage.setItem(storageKey, JSON.stringify(savedData));
      setEntity(savedData);
      setEditingSection(null);
      router.refresh();
    } catch (err) {
      console.error("Error updating organisation", err);
    }
  };

  useEffect(() => {
    const blankEntity = {
      entity_type: "ORGANTISATION",
      ksuid,
      version: 1,
    } as OrgEntity;
    const remoteEntity = data || defaultEntity;
    const initEntity = { ...blankEntity, ...remoteEntity.organisation };
    setEntity(initEntity);
  }, [data, defaultEntity, ksuid]);

  if (error) {
    console.error(error);
  }

  if (!activeOrg) {
    return "No Active Org";
  }

  if (isLoading || !data) {
    return "Loading...";
  }

  const themeValues = (entity.theme || {}) as Record<string, unknown>;

  return (
    <div className="w-full">
      <div className="sm:flex sm:items-start sm:justify-between w-full pb-6">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold text-gray-900">
            Organisation Settings
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your organisation in sections so we can keep core settings
            and theme configuration separate.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {sections.map((section) => {
          const isEditing = editingSection === section.key;
          const sectionValues =
            section.key === "theme"
              ? themeValues
              : (entity as Record<string, unknown>);

          return (
            <SettingsSection
              key={section.key}
              section={section}
              values={sectionValues}
              isEditing={isEditing}
              onEdit={
                section.editable
                  ? () => setEditingSection(section.key)
                  : undefined
              }
              onCancel={
                section.editable ? () => setEditingSection(null) : undefined
              }
            >
              {section.key === "details" || section.key === "branding" ? (
                <DynamicForm
                  schema={sectionSchemas[section.key]}
                  {...(activeOrg ? { orgSlug: activeOrg } : {})}
                  metadata={sectionMetadata[section.key]}
                  onSubmit={handleSubmit}
                  persistKey={entity}
                  data={entity}
                />
              ) : null}
            </SettingsSection>
          );
        })}

        <section className="overflow-hidden rounded-lg border border-red-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-red-200 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-red-700">Danger Zone</h2>
              <p className="mt-1 text-sm text-red-700">
                Permanently remove this organisation and all associated data.
              </p>
            </div>
            <Link
              href="/admin/onboarding/delete"
              className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800"
            >
              Delete my organisation
            </Link>
          </div>
          <div className="px-4 py-4 text-sm text-gray-700 sm:px-6">
            Stripe account closure is managed separately and this action cannot be undone.
          </div>
        </section>
      </div>
    </div>
  );
};

export default OrgPageClient;
