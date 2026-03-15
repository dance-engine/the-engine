"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useOrgContext } from "@dance-engine/utils/OrgContext";
import { labelFromSnake } from "@dance-engine/utils/textHelpers";
import useClerkSWR from "@dance-engine/utils/clerkSWR";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DanceEngineEntity } from "@dance-engine/ui/types";

type OrgEntity = DanceEngineEntity & {
  theme?: Record<string, unknown>;
  [key: string]: unknown;
};

type ThemeFormValues = Record<string, string>;

const colourFields = [
  "colour_primary",
  "colour_secondary",
  "colour_background",
  "colour_background_alt",
  "colour_surface_light",
  "colour_surface_dark",
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

const themeFieldDescriptions: Record<string, string> = {
  colour_primary: "Main accent colour used for buttons and highlights.",
  colour_secondary: "Supporting accent colour used across the theme.",
  colour_background: "Primary darker page background colour.",
  colour_background_alt: "Alternative lighter page background colour.",
  colour_surface_light: "Light panel and content surface colour.",
  colour_surface_dark: "Dark panel and content surface colour.",
  css_vars: "Optional raw CSS variables for advanced theme overrides.",
};

const blankTheme: ThemeFormValues = {
  colour_primary: "",
  colour_secondary: "",
  colour_background: "",
  colour_background_alt: "",
  colour_surface_light: "",
  colour_surface_dark: "",
  css_vars: "",
};

const defaultPickerColour = "#000000";

const isHexColour = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

const normalizeHex = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  if (/^#[0-9a-fA-F]{3}$/.test(prefixed)) {
    return `#${prefixed[1]}${prefixed[1]}${prefixed[2]}${prefixed[2]}${prefixed[3]}${prefixed[3]}`.toLowerCase();
  }

  if (isHexColour(prefixed)) {
    return prefixed.toLowerCase();
  }

  return trimmed;
};

const getPickerValue = (value: string) =>
  isHexColour(normalizeHex(value)) ? normalizeHex(value) : defaultPickerColour;

const getBaseOrganisationPayload = (entity: OrgEntity) =>
  baseOrganisationFields.reduce<Record<string, unknown>>((payload, field) => {
    const value = entity[field];
    if (value !== undefined) {
      payload[field] = value;
    }
    return payload;
  }, {});

const buildThemePayload = (values: ThemeFormValues) => {
  const payload: Record<string, string> = {};

  colourFields.forEach((field) => {
    const normalized = normalizeHex(values[field]);
    if (normalized) {
      payload[field] = normalized;
    }
  });

  if (values.css_vars.trim()) {
    payload.css_vars = values.css_vars;
  }

  return payload;
};

const ThemeColourField = ({
  field,
  value,
  onChange,
}: {
  field: (typeof colourFields)[number];
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="space-y-2">
    <div>
      <label
        htmlFor={field}
        className="block text-sm font-semibold text-gray-900"
      >
        {labelFromSnake(field)}
      </label>
      <p className="mt-1 text-sm text-gray-600">
        {themeFieldDescriptions[field]}
      </p>
    </div>
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={getPickerValue(value)}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-14 cursor-pointer rounded-md border border-gray-300 bg-white p-1"
        aria-label={`${labelFromSnake(field)} picker`}
      />
      <input
        id={field}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="#000000"
        className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
      />
    </div>
  </div>
);

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
  const [themeData, setThemeData] = useState<ThemeFormValues>(blankTheme);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const storageKey = `${activeOrg}:ORGANISATION#${activeOrg}`;
    const organisationPayload = {
      ...getBaseOrganisationPayload(entity),
      theme: buildThemePayload(themeData),
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

      const savedTheme = organisationPayload.theme as ThemeFormValues;
      const savedData = {
        ...entity,
        theme: savedTheme,
        version: Number(result.organisation.version) + 1,
        meta: { saved: "saved", updated_at: new Date().toISOString() },
      };

      localStorage.setItem(storageKey, JSON.stringify(savedData));
      setEntity(savedData);
      setThemeData({
        ...blankTheme,
        ...savedTheme,
      });
      router.refresh();
    } catch (err) {
      console.error("Error updating organisation theme", err);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const remoteEntity = data || defaultEntity;
    const initEntity = { ...remoteEntity.organisation } as OrgEntity;
    const nextTheme = (remoteEntity.organisation?.theme || {}) as Record<
      string,
      unknown
    >;

    setEntity(initEntity);
    setThemeData({
      ...blankTheme,
      ...Object.fromEntries(
        Object.entries(nextTheme).map(([key, value]) => [key, String(value)]),
      ),
    });
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
          <form onSubmit={handleSubmit} className="space-y-5">
            {colourFields.map((field) => (
              <ThemeColourField
                key={field}
                field={field}
                value={themeData[field]}
                onChange={(value) =>
                  setThemeData((current) => ({
                    ...current,
                    [field]: value,
                  }))
                }
              />
            ))}

            <div className="space-y-2">
              <label
                htmlFor="css_vars"
                className="block text-sm font-semibold text-gray-900"
              >
                Css Vars
              </label>
              <p className="text-sm text-gray-600">
                {themeFieldDescriptions.css_vars}
              </p>
              <textarea
                id="css_vars"
                value={themeData.css_vars}
                onChange={(event) =>
                  setThemeData((current) => ({
                    ...current,
                    css_vars: event.target.value,
                  }))
                }
                rows={6}
                className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-cerise-on-light px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Theme"}
            </button>
          </form>
        </section>

        <section className="min-h-[32rem] rounded-lg border border-gray-200 bg-white">
          <div className="flex h-full items-center justify-center p-6 text-sm text-gray-400">
            Preview panel coming next
          </div>
        </section>
      </div>
    </div>
  );
};

export default ThemePageClient;
