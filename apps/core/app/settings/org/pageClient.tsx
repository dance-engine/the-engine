"use client";
import Link from "next/link";
import DynamicForm from "@dance-engine/ui/form/DynamicForm";
import {
  organisationSchema,
  organisationMetadata,
} from "@dance-engine/schemas/organisation"; // Import the schema
import { FieldValues } from "react-hook-form";
import { useOrgContext } from "@dance-engine/utils/OrgContext";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import useClerkSWR from "@dance-engine/utils/clerkSWR";
import { useEffect, useState, useMemo } from "react";
import { labelFromSnake } from "@dance-engine/utils/textHelpers";
import { DanceEngineEntity } from "@dance-engine/ui/types";

const fieldOrder = Object.keys(organisationSchema.shape);

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

  if (typeof value === "string" && value.startsWith("http")) {
    return (
      <div className="space-y-3">
        {isImageField(field) ? (
          // Keep previews lightweight so the page stays easy to scan.
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
          {value}
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

const OrgPageClient = ({ ksuid }: { ksuid?: string }) => {
  const router = useRouter();
  const { activeOrg } = useOrgContext();
  const { getToken } = useAuth();

  const baseUrlEndpoint =
    `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/settings`.replace(
      "/{org}",
      `/${activeOrg || "demo"}`,
    );
  const updateUrlEndpoint = baseUrlEndpoint;
  const defaultEntity = useMemo(
    () => ({ entity_type: "ORGANISATION", activeOrg }),
    [activeOrg],
  );
  const { data, error, isLoading } = useClerkSWR(updateUrlEndpoint);

  const [entity, setEntity] = useState({ ksuid: "" } as DanceEngineEntity);
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = async (data: FieldValues) => {
    console.log("Form Submitted:", data, "destination", {
      orgSlug: activeOrg,
      url: updateUrlEndpoint,
    });
    const { _meta, ...cleanedData } = data;
    console.log("Meta", _meta);
    const storageKey = `${activeOrg}:ORGANISATION#${activeOrg}`;
    try {
      const res = await fetch(updateUrlEndpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`,
        },
        body: JSON.stringify({ organisation: cleanedData }),
      });

      const result = await res.json();

      const previousCache = JSON.parse(
        localStorage.getItem(storageKey) || "{}",
      );
      if (!res.ok) {
        const failedCache = JSON.stringify({
          ...previousCache,
          ...cleanedData,
          ...{
            meta: { saved: "failed", updated_at: new Date().toISOString() },
          },
        });
        localStorage.setItem(storageKey, failedCache);
        throw new Error(result.message || "Something went wrong");
      } else {
        // version increase because we aren't loading remote stuff as we stay on same page
        const savedData = {
          ...previousCache,
          ...cleanedData,
          ...{ version: parseInt(result.organisation.version) + 1 },
          ...{ meta: { saved: "saved", updated_at: new Date().toISOString() } },
        };
        const savedCache = JSON.stringify(savedData);
        localStorage.setItem(storageKey, savedCache);
        setEntity(savedData);
        setIsEditing(false);
        router.refresh();
      }
    } catch (err) {
      console.error("Error creating event", err);
    }
  };

  useEffect(() => {
    const blankEntity = {
      entity_type: "ORGANTISATION",
      ksuid: ksuid, // Extract the ksuid if it exists
      version: 1,
    } as DanceEngineEntity;
    // const localEntity = JSON.parse(typeof window !== "undefined" ? localStorage.getItem(`${blankEntity.type}#${blankEntity.ksuid}`) || "{}" : "{}")
    // const initEntity = {...blankEntity, ...remoteEntity[0], ...localEntity}
    const remoteEntity = data || defaultEntity;
    const initEntity = { ...blankEntity, ...remoteEntity.organisation };
    setEntity(initEntity);
  }, [activeOrg, data, defaultEntity, ksuid]);

  if (error) {
    console.error(error);
  }

  if (isLoading || !entity) {
    return "Loading...";
  }

  if (!activeOrg) {
    return "No Active Org";
  }

  if (isLoading || !data) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="sm:flex sm:items-start sm:justify-between w-full pb-6">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold text-gray-900">
            Organisation Settings
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Review your organisation details and only switch into edit mode when
            you need to make changes.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          {isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-md bg-dark-background px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-dark-highlight"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <DynamicForm
          schema={organisationSchema}
          {...(activeOrg ? { orgSlug: activeOrg } : {})}
          metadata={organisationMetadata}
          onSubmit={handleSubmit}
          persistKey={entity}
          data={entity}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <dl className="divide-y divide-gray-200">
            {fieldOrder.map((field) => (
              <div
                key={field}
                className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
              >
                <dt className="text-sm font-medium text-gray-700">
                  {labelFromSnake(field)}
                </dt>
                <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">
                  {formatFieldValue(
                    field,
                    entity[field as keyof typeof entity],
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
};

export default OrgPageClient;
