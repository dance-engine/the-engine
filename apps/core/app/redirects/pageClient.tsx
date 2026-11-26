"use client";

import { FormEvent, useEffect, useState } from "react";
import { useOrgContext } from "@dance-engine/utils/OrgContext";
import useClerkSWR from "@dance-engine/utils/clerkSWR";
import type { OrgSoloSettings } from "@dance-engine/utils/solo-edge-config-write";

const isLocalDomain = (domain: string) =>
  domain === "localhost" ||
  domain.endsWith(".localhost") ||
  domain.endsWith(".local") ||
  domain.endsWith(".vercel.app") ||
  /^\d+(\.\d+){3}$/.test(domain);

const normaliseSource = (value: string) => {
  const trimmed = value.trim();
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash === "/" ? "/" : withSlash.replace(/\/+$/, "");
};

const QR_SIZE = 512;

/** QR image URL from goqr.me (api.qrserver.com) for a public address. */
const qrImageUrl = (data: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${QR_SIZE}x${QR_SIZE}&format=png&margin=8&data=${encodeURIComponent(data)}`;

const validate = (source: string, target: string): string | null => {
  if (!/^\/([a-zA-Z0-9_-]+(\/[a-zA-Z0-9_-]+)*)?$/.test(source)) {
    return "The path must look like /feedback — letters, numbers, - and _ only.";
  }
  if (source === "/events") return "/events always shows your events list and can't be redirected.";
  if (!/^\/(?!\/)\S*$/.test(target) && !/^https:\/\/\S+$/.test(target)) {
    return "Send visitors to a page on your site (/events/…) or a full https:// link.";
  }
  if (source === target) return "A redirect can't point to itself.";
  return null;
};

const RedirectsPageClient = () => {
  const { activeOrg } = useOrgContext();
  const endpoint = activeOrg ? `/api/solo-config/${activeOrg}` : null;
  const { data, error, isLoading, mutate } = useClerkSWR(endpoint);
  const settings = data as OrgSoloSettings | undefined;

  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [qrPath, setQrPath] = useState<string | null>(null);

  useEffect(() => {
    if (!qrPath) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setQrPath(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [qrPath]);

  const redirects = settings?.redirects ?? {};
  const siteDomain = settings?.domains.find((domain) => !isLocalDomain(domain)) ?? null;

  const saveRedirects = async (next: Record<string, string>, key: string) => {
    if (!endpoint) return false;
    setSavingKey(key);
    setFormError(null);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: "redirects", value: next }),
      });
      const result = await res.json();
      if (!res.ok) {
        setFormError(result.error ?? "Could not save redirects.");
        return false;
      }
      await mutate(result, { revalidate: false });
      return true;
    } catch {
      setFormError("Could not save redirects. Check your connection and try again.");
      return false;
    } finally {
      setSavingKey(null);
    }
  };

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSource = normaliseSource(source);
    const nextTarget = target.trim();

    const problem = validate(nextSource, nextTarget);
    if (problem) {
      setFormError(problem);
      return;
    }
    if (redirects[nextSource]) {
      setFormError(`${nextSource} already redirects. Remove it first to change it.`);
      return;
    }

    if (await saveRedirects({ ...redirects, [nextSource]: nextTarget }, "add")) {
      setSource("");
      setTarget("");
    }
  };

  const handleRemove = (path: string) => {
    const { [path]: _removed, ...rest } = redirects;
    void saveRedirects(rest, path);
  };

  if (!activeOrg) return <p className="w-full text-sm text-gray-700">Select an organisation to manage redirects.</p>;
  if (error) return <p className="w-full text-sm text-red-700">Could not load redirects.</p>;
  if (isLoading || !settings) return <p className="w-full text-sm text-gray-700">Loading...</p>;

  const entries = Object.entries(redirects).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="w-full">
      <div className="w-full pb-6">
        <h1 className="text-base font-semibold text-gray-900">Redirects</h1>
        <p className="mt-2 text-sm text-gray-700">
          Send visitors from a short path on your website to another page or link. Changes go live
          within a few seconds.
        </p>
      </div>

      <div className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-900">Add a redirect</h2>
          <form
            onSubmit={handleAdd}
            className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start"
          >
            <div className="space-y-2">
              <label htmlFor="redirect-source" className="block text-sm font-semibold text-gray-900">
                From
              </label>
              <div className="flex rounded-md border border-gray-300">
                <span className="flex max-w-[60%] shrink-0 items-center rounded-l-md border-r border-gray-300 bg-gray-50 px-3 font-mono text-sm text-gray-500">
                  <span className="truncate">{siteDomain ?? ""}</span>/
                </span>
                <input
                  id="redirect-source"
                  value={source}
                  onChange={(event) => setSource(event.target.value.replace(/^\/+/, ""))}
                  placeholder="feedback"
                  className="min-w-0 flex-1 rounded-r-md px-3 py-2 font-mono text-sm"
                />
              </div>
              <p className="text-sm text-gray-600">Leave blank to redirect your homepage.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="redirect-target" className="block text-sm font-semibold text-gray-900">
                To
              </label>
              <input
                id="redirect-target"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder="https://"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
              />
              <p className="text-sm text-gray-600">A page on your site (/events/…) or a full https:// link.</p>
            </div>

            <div className="md:pt-7">
              <button
                type="submit"
                disabled={savingKey !== null}
                className="w-full whitespace-nowrap rounded-md bg-cerise-on-light px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
              >
                {savingKey === "add" ? "Saving..." : "Add redirect"}
              </button>
            </div>

            {formError && (
              <p className="text-sm text-red-700 md:col-span-3" role="alert">{formError}</p>
            )}
          </form>
        </section>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          {entries.length === 0 ? (
            <p className="p-6 text-sm text-gray-600">No redirects yet.</p>
          ) : (
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-900">
                <tr>
                  <th className="w-2/5 px-4 py-3 font-semibold">From</th>
                  <th className="px-4 py-3 font-semibold">To</th>
                  <th className="w-44 px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entries.map(([path, destination]) => (
                  <tr key={path}>
                    <td className="truncate px-4 py-3 font-mono text-gray-900" title={path}>
                      {siteDomain && <span className="text-gray-500">{siteDomain}</span>}
                      {path}
                    </td>
                    <td className="truncate px-4 py-3 font-mono text-gray-700" title={destination}>
                      {destination}
                    </td>
                    <td className="space-x-4 whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setQrPath(path)}
                        disabled={!siteDomain}
                        title={siteDomain ? undefined : "Add a live domain to generate QR codes"}
                        className="text-sm font-semibold text-cerise-on-light hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        QR code
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(path)}
                        disabled={savingKey !== null}
                        className="text-sm font-semibold text-cerise-on-light hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingKey === path ? "Removing..." : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {qrPath && siteDomain && (
        <QrCodeDialog url={`https://${siteDomain}${qrPath}`} onClose={() => setQrPath(null)} />
      )}
    </div>
  );
};

const QrCodeDialog = ({ url, onClose }: { url: string; onClose: () => void }) => {
  const imageUrl = qrImageUrl(url);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-dialog-title"
        className="max-h-full w-full max-w-[34rem] overflow-y-auto rounded-lg bg-white p-4 shadow-xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="qr-dialog-title" className="text-sm font-semibold text-gray-900">QR code</h2>
            <p className="mt-1 truncate font-mono text-sm text-gray-600" title={url}>{url}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-cerise-on-light hover:underline"
          >
            Close
          </button>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element -- external generated image */}
        <img
          src={imageUrl}
          alt={`QR code for ${url}`}
          width={QR_SIZE}
          height={QR_SIZE}
          className="mx-auto mt-4 aspect-square w-full max-w-[512px] border border-gray-200"
        />

        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm font-semibold text-cerise-on-light hover:underline"
        >
          Open image in new tab
        </a>
      </div>
    </div>
  );
};

export default RedirectsPageClient;
