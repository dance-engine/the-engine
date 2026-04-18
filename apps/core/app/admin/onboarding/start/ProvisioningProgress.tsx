"use client";

import { useEffect, useMemo, useState } from "react";

type StackEvent = {
  logicalResourceId?: string;
  resourceType?: string;
  resourceStatus?: string;
  timestamp?: string;
  statusReason?: string;
};

type StackStatusResponse = {
  organisation?: string;
  stackId?: string;
  stackName?: string;
  stackStatus?: string;
  pct?: number;
  done?: boolean;
  ok?: boolean;
  recentEvents?: StackEvent[];
};

type ProvisioningProgressProps = {
  organisationId: string;
  apiBaseUrl?: string;
  getToken: () => Promise<string | null>;
};

const POLL_INTERVAL_MS = 3000;

const statusTone = (ok: boolean | undefined): "green" | "red" | "slate" => {
  if (ok === true) {
    return "green";
  }
  if (ok === false) {
    return "red";
  }
  return "slate";
};

export default function ProvisioningProgress({
  organisationId,
  apiBaseUrl,
  getToken,
}: ProvisioningProgressProps) {
  const [result, setResult] = useState<StackStatusResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const endpoint = useMemo(() => {
    if (!apiBaseUrl || !organisationId) {
      return null;
    }
    return `${apiBaseUrl}/organisations/${organisationId}/stack-status`;
  }, [apiBaseUrl, organisationId]);

  useEffect(() => {
    if (!endpoint) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      setLoading(true);
      setError("");

      try {
        const token = await getToken();
        const response = await fetch(endpoint, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof payload?.message === "string"
              ? payload.message
              : `Failed to load stack status (${response.status})`,
          );
        }

        if (cancelled) {
          return;
        }

        const nextResult = payload as StackStatusResponse;
        setResult(nextResult);

        if (!nextResult.done) {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (pollError) {
        if (cancelled) {
          return;
        }
        setError(
          pollError instanceof Error
            ? pollError.message
            : "Unable to fetch provisioning progress",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [endpoint, getToken]);

  const pct = Math.max(0, Math.min(100, result?.pct ?? 0));
  const tone = statusTone(result?.ok);
  const barClass =
    tone === "green"
      ? "bg-green-500"
      : tone === "red"
        ? "bg-red-500"
        : "bg-slate-500";

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900">Provisioning progress</h3>
        {loading ? <span className="text-xs text-gray-500">Refreshing…</span> : null}
      </div>

      <p className="mt-1 text-xs text-gray-600">
        Organisation: <span className="font-mono">{organisationId}</span>
      </p>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full transition-all duration-300 ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-700">
        <span>Status: {result?.stackStatus ?? "Waiting for first status…"}</span>
        <span>{pct}%</span>
      </div>

      {result?.stackName ? (
        <p className="mt-1 text-xs text-gray-500">Stack: {result.stackName}</p>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      {Array.isArray(result?.recentEvents) && result.recentEvents.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-gray-700">
            Recent CloudFormation events
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-gray-600">
            {result.recentEvents.slice(0, 8).map((event, index) => (
              <li key={`${event.logicalResourceId ?? "resource"}-${event.timestamp ?? "time"}-${index}`}>
                <span className="font-mono">{event.resourceStatus ?? "UNKNOWN"}</span>
                {" · "}
                {event.logicalResourceId ?? event.resourceType ?? "resource"}
                {event.statusReason ? ` — ${event.statusReason}` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
