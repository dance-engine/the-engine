"use client";

import DynamicForm from "@dance-engine/ui/form/DynamicForm";
import { organisationSchema } from "@dance-engine/schemas/organisation";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FieldValues } from "react-hook-form";

const onboardingSchema = organisationSchema.pick({
  name: true,
  description: true,
  organisation: true,
  account_id: true,
  status: true,
});

const onboardingMetadata = {
  description: { richText: true },
  account_id: { onceOnly: true },
};

const slugifyOrganisation = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const OnboardingStartPageClient = () => {
  const router = useRouter();
  const { getToken } = useAuth();

  const initialData = useMemo(
    () => ({
      entity_type: "ORGANISATION",
      ksuid: "new-onboarding-org",
      name: "",
      description: "",
      organisation: "",
      account_id: "",
      status: "setup",
      version: 1,
    }),
    [],
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [createdSlug, setCreatedSlug] = useState("");

  const handleSubmit = async (formData: FieldValues) => {
    const { _meta, ...cleanedData } = formData;
    const organisation = slugifyOrganisation(
      String(cleanedData.organisation || cleanedData.name || ""),
    );

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/organisations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getToken()}`,
          },
          body: JSON.stringify({
            organisation: {
              ...cleanedData,
              organisation,
            },
          }),
        },
      );

      const result = (await res.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!res.ok) {
        throw new Error(result.message || "Failed to start organisation setup");
      }

      setCreatedSlug(organisation);
      setSuccessMessage(
        result.message ||
          "Organisation setup has been initiated. AWS provisioning is now in progress.",
      );
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to start organisation setup",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl py-2">
      <div className="sm:flex sm:items-start sm:justify-between w-full pb-6">
        <div className="sm:flex-auto">
          <p className="text-sm font-medium text-gray-500">Admin / Onboarding</p>
          <h1 className="mt-2 text-base font-semibold text-gray-900">
            Start Organisation Setup
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Create a new organisation record and kick off the provisioning flow.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
          {successMessage ? (
            <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-semibold">Setup started</p>
              <p>{successMessage}</p>
              {createdSlug ? (
                <p className="mt-1">Organisation slug: {createdSlug}</p>
              ) : null}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <DynamicForm
            schema={onboardingSchema}
            metadata={onboardingMetadata}
            onSubmit={handleSubmit}
            persistKey={initialData}
            data={initialData}
          />

          {isSubmitting ? (
            <p className="mt-3 text-sm text-gray-500">Submitting onboarding request…</p>
          ) : null}
        </section>

        <aside className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-900">What happens next</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
            <li>The organisation record is created in the core table.</li>
            <li>A provisioning stack is started for the new organisation.</li>
            <li>Once AWS finishes, the org-specific resources are populated.</li>
          </ul>
          <p className="mt-4 text-xs text-gray-500">
            Tip: you can enter a plain name in the slug field and it will be normalised automatically.
          </p>
        </aside>
      </div>
    </div>
  );
};

export default OnboardingStartPageClient;
