"use client";

import { FormEvent, useEffect, useState } from "react";
import useClerkSWR from "@dance-engine/utils/clerkSWR";
import { nameFromHypenated } from "@dance-engine/utils/textHelpers";
import type { OrgSoloSettings } from "@dance-engine/utils/solo-edge-config-write";

/**
 * Chooses which solo-site theme the org uses. Stored in the shared Edge Config
 * (`solo.themes`), not on the organisation record, so it never touches colours.
 */
const SiteThemeSwitcher = ({ org }: { org: string }) => {
  const endpoint = `/api/solo-config/${org}`;
  const { data, error, isLoading, mutate } = useClerkSWR(endpoint);
  const settings = data as OrgSoloSettings | undefined;

  const [selected, setSelected] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const currentTheme = settings?.theme ?? "default";

  useEffect(() => {
    setSelected(currentTheme);
    setMessage(null);
  }, [currentTheme, org]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || selected === currentTheme) return;

    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: "theme", value: selected }),
      });
      const result = await res.json();
      if (!res.ok) {
        setMessage({ tone: "error", text: result.error ?? "Could not change theme." });
        return;
      }
      await mutate(result, { revalidate: false });
      setMessage({
        tone: "success",
        text: `Switched to ${selectedLabel}. Your site updates within a few seconds.`,
      });
    } catch {
      setMessage({ tone: "error", text: "Could not change theme. Check your connection and try again." });
    } finally {
      setIsSaving(false);
    }
  };

  if (error) {
    return <p className="text-sm text-red-700">Could not load site theme.</p>;
  }

  // Keep the current theme selectable-as-shown even if it isn't one this org could pick
  // (e.g. a super admin assigned it), so the dropdown never lies about what's live.
  const themes = settings
    ? settings.availableThemes.some((theme) => theme.name === currentTheme)
      ? settings.availableThemes
      : [
          { name: currentTheme, label: nameFromHypenated(currentTheme), private: false },
          ...settings.availableThemes,
        ]
    : [];
  const selectedLabel = themes.find((theme) => theme.name === selected)?.label ?? selected;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="space-y-2 sm:w-72">
        <label htmlFor="site-theme" className="block text-sm font-semibold text-gray-900">
          Site theme
        </label>
        <select
          id="site-theme"
          value={selected}
          onChange={(event) => {
            setSelected(event.target.value);
            setMessage(null);
          }}
          disabled={isLoading || !settings || isSaving}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          {isLoading || !settings ? (
            <option>Loading…</option>
          ) : (
            themes.map((theme) => (
              <option key={theme.name} value={theme.name}>
                {theme.label}
                {theme.private ? " · Private" : ""}
                {theme.name === currentTheme ? " (current)" : ""}
              </option>
            ))
          )}
        </select>
      </div>

      <button
        type="submit"
        disabled={isSaving || !settings || selected === currentTheme}
        className="whitespace-nowrap rounded-md bg-cerise-on-light px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "Switching..." : "Use this theme"}
      </button>

      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`text-sm sm:self-center ${message.tone === "error" ? "text-red-700" : "text-gray-700"}`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
};

export default SiteThemeSwitcher;
