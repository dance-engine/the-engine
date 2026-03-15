"use client";

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
import { DanceEngineEntity } from "@dance-engine/ui/types";

type OrgEntity = DanceEngineEntity & {
  theme?: Record<string, unknown>;
  [key: string]: unknown;
};

const themeFields = [
  "colour_primary",
  "colour_secondary",
  "colour_background",
  "colour_background_alt",
  "colour_surface_light",
  "colour_surface_dark",
  "css_vars",
] as const;

const baseOrganisationFields = [
  "name",
  "description",
  "organisation",
  "status",
  "account_id",
  "banner",
  "banner_overlay",
  "logo",
  "logo_secondary_url",
  "logo_icon_url",
  "created_at",
  "updated_at",
  "version",
] as const;

const themeSchema = organisationSchema.pick({
  colour_primary: true,
  colour_secondary: true,
  colour_background: true,
  colour_background_alt: true,
  colour_surface_light: true,
  colour_surface_dark: true,
  css_vars: true,
});

const themeMetadata = {
  css_vars: organisationMetadata.css_vars,
};

const getBaseOrganisationPayload = (entity: OrgEntity) =>
  baseOrganisationFields.reduce<Record<string, unknown>>((payload, field) => {
    const value = entity[field];
    if (value !== undefined) {
      payload[field] = value;
    }
    return payload;
  }, {});

const ThemePageClient = () => {
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
  const [themeData, setThemeData] = useState<Record<string, unknown>>({});

  const handleSubmit = async (formData: FieldValues) => {
    const { _meta, ...cleanedData } = formData;
    const storageKey = `${activeOrg}:ORGANISATION#${activeOrg}`;
    const organisationPayload = {
      ...getBaseOrganisationPayload(entity),
      theme: themeFields.reduce<Record<string, unknown>>((theme, field) => {
        const value = cleanedData[field];
        if (value !== undefined) {
          theme[field] = value;
        }
        return theme;
      }, {}),
    };

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
          ...getBaseOrganisationPayload(entity),
          theme: organisationPayload.theme,
          meta: { saved: "failed", updated_at: new Date().toISOString() },
        });
        localStorage.setItem(storageKey, failedCache);
        throw new Error(result.message || "Something went wrong");
      }

      const savedData = {
        ...entity,
        theme: organisationPayload.theme,
        version: Number(result.organisation.version) + 1,
        meta: { saved: "saved", updated_at: new Date().toISOString() },
      };

      localStorage.setItem(storageKey, JSON.stringify(savedData));
      setEntity(savedData);
      setThemeData((savedData.theme || {}) as Record<string, unknown>);
      router.refresh();
    } catch (err) {
      console.error("Error updating organisation theme", err);
    }
  };

  useEffect(() => {
    const remoteEntity = data || defaultEntity;
    const initEntity = { ...remoteEntity.organisation } as OrgEntity;
    setEntity(initEntity);
    setThemeData(
      (remoteEntity.organisation?.theme || {}) as Record<string, unknown>,
    );
  }, [data, defaultEntity]);

  if (error) {
    console.error(error);
  }

  if (!activeOrg) {
    return "No Active Org";
  }

  if (isLoading || !data) {
    return "Loading...";
  }

  return (
    <div className="w-full">
      <div className="sm:flex sm:items-start sm:justify-between w-full pb-6">
        <div className="sm:flex-auto">
          <p className="text-sm font-medium text-gray-500">
            <Link href="/settings/org" className="hover:text-gray-700">
              Organisation Settings
            </Link>{" "}
            / Theme
          </p>
          <h1 className="mt-2 text-base font-semibold text-gray-900">
            Theme Editor
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Update theme tokens separately from the main organisation record.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
          <DynamicForm
            schema={themeSchema}
            {...(activeOrg ? { orgSlug: activeOrg } : {})}
            metadata={themeMetadata}
            onSubmit={handleSubmit}
            persistKey={entity}
            data={themeData}
          />
        </section>

        <section className="rounded-lg border border-gray-200 bg-white min-h-[32rem]">
          <div className="flex h-full items-center justify-center p-6 text-sm text-gray-400">
            Preview panel coming next
          </div>
        </section>
      </div>
    </div>
  );
};

export default ThemePageClient;
