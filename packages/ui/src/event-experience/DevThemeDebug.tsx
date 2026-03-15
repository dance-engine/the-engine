"use client";

import { useEffect, useState } from "react";
import {
  buildOrganisationTheme,
  OrganisationTheme,
} from "./lib/organisationTheme";

type SchemeMode = "system" | "light" | "dark";

const editableTokens = [
  { label: "Primary", valueKey: "primary" },
  { label: "Secondary", valueKey: "secondary" },
  { label: "Light background", valueKey: "backgroundLight" },
  { label: "Dark background", valueKey: "backgroundDark" },
  { label: "Light surface", valueKey: "surfaceLight" },
  { label: "Dark surface", valueKey: "surfaceDark" },
] as const;

export default function DevThemeDebug({ theme }: { theme: OrganisationTheme }) {
  const [open, setOpen] = useState(false);
  const [scheme, setScheme] = useState<SchemeMode>("system");
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      editableTokens.map((token) => [token.valueKey, theme[token.valueKey]]),
    ),
  );

  useEffect(() => {
    const root = document.documentElement;

    if (scheme === "system") {
      delete root.dataset.devColorScheme;
    } else {
      root.dataset.devColorScheme = scheme;
    }
  }, [scheme]);

  useEffect(() => {
    const root = document.documentElement;
    return () => {
      delete root.dataset.devColorScheme;
    };
  }, []);

  const previewTheme = buildOrganisationTheme({
    ...theme,
    ...values,
  });

  return (
    <div className="fixed right-4 top-4 z-50 w-[320px] max-w-[calc(100vw-2rem)]">
      <style dangerouslySetInnerHTML={{ __html: previewTheme.cssText }} />
      <div className="rounded-2xl border border-black/10 bg-white/95 p-3 text-sm text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Dev theme
            </p>
            <p className="text-sm font-semibold">Live preview controls</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
          >
            {open ? "Hide" : "Edit"}
          </button>
        </div>

        {open ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Scheme preview
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["system", "light", "dark"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setScheme(mode)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold capitalize ${
                      scheme === mode
                        ? "text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                    style={
                      scheme === mode
                        ? { backgroundColor: "var(--highlight-color)" }
                        : undefined
                    }
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              {editableTokens.map((token) => (
                <label
                  key={token.valueKey}
                  className="grid grid-cols-[1fr_auto] items-center gap-3"
                >
                  <span className="text-xs font-medium text-slate-600">
                    {token.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={values[token.valueKey]}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [token.valueKey]: event.target.value,
                        }))
                      }
                      className="h-8 w-8 rounded-md border border-slate-200 bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={values[token.valueKey]}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [token.valueKey]: event.target.value,
                        }))
                      }
                      className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs font-mono text-slate-700"
                    />
                  </div>
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
