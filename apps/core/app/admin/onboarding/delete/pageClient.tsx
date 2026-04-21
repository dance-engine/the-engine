"use client";

import { useAuth } from "@clerk/nextjs";
import { useOrgContext } from "@dance-engine/utils/OrgContext";
import { useMemo, useState } from "react";
import ProvisioningProgress from "../start/ProvisioningProgress";

const OnboardingDeletePageClient = () => {
  const { activeOrg, isLoaded } = useOrgContext();
  const { getToken } = useAuth();

  const [confirmDataDeletion, setConfirmDataDeletion] = useState(false);
  const [confirmIrreversible, setConfirmIrreversible] = useState(false);
  const [confirmStripeNotice, setConfirmStripeNotice] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deletingOrg, setDeletingOrg] = useState("");

  const canSubmit = useMemo(() => {
    return (
      isLoaded &&
      Boolean(activeOrg) &&
      confirmDataDeletion &&
      confirmIrreversible &&
      confirmStripeNotice &&
      !isSubmitting
    );
  }, [
    isLoaded,
    activeOrg,
    confirmDataDeletion,
    confirmIrreversible,
    confirmStripeNotice,
    isSubmitting,
  ]);

  const handleStartDeletion = async () => {
    if (!activeOrg || !canSubmit) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/organisations/${activeOrg}/delete-stack`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            confirm_delete_data: true,
            confirm_stripe_managed_separately: true,
            confirm_irreversible: true,
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof payload?.message === "string"
            ? payload.message
            : `Failed to initiate organisation deletion (${response.status})`;
        throw new Error(message);
      }

      setDeletingOrg(activeOrg);
      setSuccessMessage(
        typeof payload?.message === "string"
          ? payload.message
          : "Organisation deletion has been initiated.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to initiate organisation deletion",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return <p className="text-sm text-gray-700">Loading organisation…</p>;
  }

  if (!activeOrg) {
    return <p className="text-sm text-gray-700">No active organisation selected.</p>;
  }

  return (
    <div className="w-full max-w-4xl py-2">
      <div className="sm:flex sm:items-start sm:justify-between w-full pb-6">
        <div className="sm:flex-auto">
          <p className="text-sm font-medium text-gray-500">Admin / Offboarding</p>
          <h1 className="mt-2 text-base font-semibold text-gray-900">
            Delete Organisation Infrastructure
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            This will permanently remove organisation infrastructure and related data.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-lg border border-red-200 bg-white p-4 sm:p-6">
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-semibold">Danger zone</p>
            <p className="mt-1">
              You are deleting organisation <span className="font-semibold">{activeOrg}</span>.
            </p>
            <p className="mt-1">All customer records and related data will be deleted.</p>
            <p className="mt-1">
              Stripe account closure is separate and must be handled directly in Stripe.
            </p>
            <p className="mt-1">This action cannot be undone.</p>
          </div>

          <div className="mt-4 space-y-3 text-sm text-gray-800">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={confirmDataDeletion}
                onChange={(event) => setConfirmDataDeletion(event.target.checked)}
                className="mt-0.5"
              />
              <span>I understand all organisation data will be deleted.</span>
            </label>

            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={confirmStripeNotice}
                onChange={(event) => setConfirmStripeNotice(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                I understand Stripe account shutdown is separate and must be completed manually.
              </span>
            </label>

            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={confirmIrreversible}
                onChange={(event) => setConfirmIrreversible(event.target.checked)}
                className="mt-0.5"
              />
              <span>I understand this action is irreversible.</span>
            </label>
          </div>

          <div className="mt-5">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleStartDeletion}
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-red-800"
            >
              {isSubmitting ? "Starting deletion..." : "Delete organisation"}
            </button>
          </div>

          {successMessage ? (
            <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              {successMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}
        </section>

        <aside className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-900">Deletion progress</h2>
          {deletingOrg ? (
            <ProvisioningProgress
              organisationId={deletingOrg}
              apiBaseUrl={process.env.NEXT_PUBLIC_DANCE_ENGINE_API}
              getToken={getToken}
              title="Deletion progress"
            />
          ) : (
            <p className="mt-3 text-sm text-gray-600">
              Confirm all warnings and start deletion to track CloudFormation teardown.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
};

export default OnboardingDeletePageClient;
