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
  touchedSteps?: number;
  totalSteps?: number;
  archived?: boolean;
  done?: boolean;
  ok?: boolean;
  resourceSummary?: {
    total?: number;
    completed?: number;
    failed?: number;
    inProgress?: number;
    done?: number;
    pct?: number;
  };
  recentEvents?: StackEvent[];
};

type PollDebugState = {
  lastHttpStatus?: number;
  lastPolledAt?: string;
  lastPayload?: string;
};

type ProvisioningProgressProps = {
  organisationId: string;
  apiBaseUrl?: string;
  getToken: () => Promise<string | null>;
  title?: string;
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

const splitIdentifier = (value: string) => {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const parseStageFromStackName = (stackName?: string) => {
  if (!stackName) return null;
  const marker = "-org-";
  const idx = stackName.indexOf(marker);
  if (idx <= 0) return null;
  return stackName.slice(0, idx);
};

const toFriendlyEventText = (
  event: StackEvent,
  organisationId: string,
  stackName?: string,
) => {
  const status = event.resourceStatus ?? "";
  const logicalResourceId = event.logicalResourceId ?? event.resourceType ?? "resource";
  const friendlyResource = splitIdentifier(logicalResourceId);
  const stage = parseStageFromStackName(stackName) ?? "current";
  const isRootStackEvent = Boolean(stackName && logicalResourceId === stackName);

  if (isRootStackEvent && status === "CREATE_IN_PROGRESS") {
    return `Starting deployment for organisation "${organisationId}" in ${stage} environment.`;
  }

  if (isRootStackEvent && status === "CREATE_COMPLETE") {
    return `Finished deploying resources for organisation "${organisationId}" in ${stage} environment.`;
  }

  if (isRootStackEvent && status === "DELETE_IN_PROGRESS") {
    return `Starting teardown for organisation "${organisationId}" in ${stage} environment.`;
  }

  if (isRootStackEvent && status === "DELETE_COMPLETE") {
    return `Finished teardown for organisation "${organisationId}" in ${stage} environment.`;
  }

  if (status === "CREATE_IN_PROGRESS") {
    return `Started deploying ${friendlyResource} (${logicalResourceId}).`;
  }

  if (status === "CREATE_COMPLETE") {
    return `Finished deploying ${friendlyResource} (${logicalResourceId}).`;
  }

  if (status === "UPDATE_IN_PROGRESS") {
    return `Started updating ${friendlyResource} (${logicalResourceId}).`;
  }

  if (status === "UPDATE_COMPLETE") {
    return `Finished updating ${friendlyResource} (${logicalResourceId}).`;
  }

  if (status === "DELETE_IN_PROGRESS") {
    return `Started removing ${friendlyResource} (${logicalResourceId}).`;
  }

  if (status === "DELETE_COMPLETE") {
    return `Finished removing ${friendlyResource} (${logicalResourceId}).`;
  }

  if (status.includes("FAILED")) {
    return `Failed while applying ${friendlyResource} (${logicalResourceId}).`;
  }

  if (status.includes("ROLLBACK")) {
    return `Rollback in progress for ${friendlyResource} (${logicalResourceId}).`;
  }

  if (!status) {
    return `Processing ${friendlyResource} (${logicalResourceId}).`;
  }

  return `${splitIdentifier(status)} for ${friendlyResource} (${logicalResourceId}).`;
};

export default function ProvisioningProgress({
  organisationId,
  apiBaseUrl,
  getToken,
  title,
}: ProvisioningProgressProps) {
  const [result, setResult] = useState<StackStatusResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState<PollDebugState>({});

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
        const payloadText = (() => {
          try {
            return JSON.stringify(payload, null, 2);
          } catch {
            return String(payload ?? "");
          }
        })();

        setDebug({
          lastHttpStatus: response.status,
          lastPolledAt: new Date().toISOString(),
          lastPayload: payloadText,
        });

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

        setDebug((prev) => ({
          ...prev,
          lastPolledAt: new Date().toISOString(),
          lastPayload: pollError instanceof Error ? pollError.message : String(pollError),
        }));

        setError(
          pollError instanceof Error
            ? pollError.message
            : "Unable to fetch provisioning progress",
        );
        // Keep polling — stack may not exist yet (cf_stack_id not written yet)
        timer = setTimeout(poll, POLL_INTERVAL_MS);
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
  const latestEvent = Array.isArray(result?.recentEvents) && result.recentEvents.length > 0
    ? result.recentEvents[0]
    : null;
  const latestEventText = latestEvent
    ? toFriendlyEventText(latestEvent, organisationId, result?.stackName)
    : "Waiting for first provisioning event…";
  const isDev = process.env.NODE_ENV === "development";
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
        <h3 className="text-sm font-semibold text-gray-900">{title ?? "Provisioning progress"}</h3>
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

      {typeof result?.touchedSteps === "number" && typeof result?.totalSteps === "number" ? (
        <p className="mt-2 text-xs text-gray-600">
          Steps: <span className="font-semibold">{result.touchedSteps}</span> of <span className="font-semibold">{result.totalSteps}</span>
        </p>
      ) : null}

      <p className="mt-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        {latestEventText}
      </p>

      {result?.stackName ? (
        <p className="mt-1 text-xs text-gray-500">Stack: {result.stackName}</p>
      ) : null}

      {result?.archived ? (
        <p className="mt-2 rounded-md border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-800">
          Organisation has been archived.
        </p>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {result === null
            ? "Waiting for stack initialisation — this may take a few seconds…"
            : error}
        </div>
      ) : null}

      {Array.isArray(result?.recentEvents) && result.recentEvents.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-gray-700">
            CloudFormation events
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-gray-600">
            {result.recentEvents.map((event, index) => (
              <li key={`${event.logicalResourceId ?? "resource"}-${event.timestamp ?? "time"}-${index}`}>
                {toFriendlyEventText(event, organisationId, result?.stackName)}
                {event.statusReason ? (
                  <span className="text-gray-500"> {`(${event.statusReason})`}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {isDev ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-gray-700">
            Debug details
          </summary>
          <div className="mt-2 space-y-1 text-xs text-gray-600">
            <p>
              Endpoint: <span className="font-mono break-all">{endpoint ?? "not configured"}</span>
            </p>
            <p>
              Last HTTP status: <span className="font-mono">{debug.lastHttpStatus ?? "n/a"}</span>
            </p>
            <p>
              Last poll at: <span className="font-mono">{debug.lastPolledAt ? new Date(debug.lastPolledAt).toLocaleString() : "n/a"}</span>
            </p>
          </div>
          <pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-900 p-2 text-xs text-slate-100 whitespace-pre-wrap break-words">
            {debug.lastPayload ?? "No payload yet"}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
