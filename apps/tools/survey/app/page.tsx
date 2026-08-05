"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

const danceGroups = {
  Salsa: ["Cuban", "Rueda", "LA", "New York"],
  Bachata: ["Dominican", "Moderna", "Sensual"],
  Kizomba: ["Traditional", "UrbanKiz"],
  Other: ["Son", "Cha Cha", "Zouk"],
} as const;
const categoryChoices = [
  { value: "unknown", label: "Don't know about this style", storedValue: "Don't know about this style" },
  { value: "not-interested", label: "Not interested", storedValue: "Not interested" },
  { value: "interested", label: "Interested", storedValue: undefined },
] as const;
const substyleScale = [
  { value: "Not for me", shortLabel: "Not for me" },
  { value: "Curious", shortLabel: "Curious" },
  { value: "Want to learn", shortLabel: "Want to learn" },
  { value: "Learning or dancing", shortLabel: "Learning" },
  { value: "A favourite", shortLabel: "Favourite" },
] as const;
const stages = ["Welcome", "Location", "Dance styles", "Learning", "Favourites", "Contact"];
type FormData = {
  location: { countryFrom: string; countryCurrent: string; area: string };
  styles: Record<string, string>;
  learning: { teacher: number; practice: number; social: number; lessonCurrency: string; lessonPrice: string; learningSource: string; congresses: string };
  favourites: { teacher: string; event: string; song: string };
  contact: { wantsUpdates: string; name: string; email: string; phone: string };
};
type StageProps = {
  data: FormData;
  update: <K extends keyof FormData>(section: K, values: Partial<FormData[K]>) => void;
};
const initial: FormData = { location: { countryFrom: "", countryCurrent: "", area: "" }, styles: {}, learning: { teacher: 0, practice: 0, social: 0, lessonCurrency: "GBP", lessonPrice: "", learningSource: "", congresses: "" }, favourites: { teacher: "", event: "", song: "" }, contact: { wantsUpdates: "", name: "", email: "", phone: "" } };
const STORAGE_KEY = "dance-survey-draft-v1";

const styleKey = (group: string, substyle: string) => `${group}: ${substyle}`;

function migrateStyleKeys(styles: Record<string, string> = {}) {
  const migrated = { ...styles };
  Object.entries(danceGroups).forEach(([group, substyles]) => {
    substyles.forEach(substyle => {
      const namespacedKey = styleKey(group, substyle);
      if (!migrated[namespacedKey] && migrated[substyle]) migrated[namespacedKey] = migrated[substyle];
      delete migrated[substyle];
    });
  });
  return migrated;
}

function ThemeVariables() {
  return <style>{`
    :root {

    /* -- Dance Engine Colors -- */

      --de-pink: oklch(60% 58% 354deg);
      --de-keppel:  oklch(69% 30% 177deg);
      --de-pear: oklch(86% 41% 113deg);

    /* -- Light mode variables -- */

      --sbk-page-light: #f7f4ee;
      --sbk-text-light: #17201e;
      --sbk-surface-light: #ffffff;
      --sbk-input-light: #ffffff;
      --sbk-text-muted-light: #57534e;
      --sbk-text-subtle-light: #78716c;
      --sbk-text-faint-light: #a8a29e;
      --sbk-border-light: #d6d3d1;
      --sbk-border-soft-light: #e7e5e4;
      --sbk-hover-light: #f5f5f4;
      --sbk-primary-light: var(--de-pink);
      --sbk-primary-hover-light: oklch(60% 88% 354deg);
      --sbk-primary-soft-light: #fff7ed;
      --sbk-primary-soft-text-light: #44403c;
      --sbk-aside-light: var(--de-keppel);
      --sbk-on-aside-light: #ffffff;
      --sbk-aside-accent-light: var(--de-pear);
      --sbk-aside-muted-light: rgba(254, 254, 254, 0.85);
      --sbk-aside-faint-light: rgba(236, 253, 245, 0.70);
      --sbk-success-light: #10b981;
      --sbk-neutral-light: #d6d3d1;
      --sbk-danger-bg-light: #fef2f2;
      --sbk-danger-text-light: #b91c1c;
      --sbk-shadow-light: rgba(60, 45, 30, 0.12);
      --sbk-ring-light: rgba(23, 32, 27, 0.10);

    
    /* -- Dark mode variables -- */

      --sbk-page-dark: #181520;
      --sbk-text-dark: #FFFFFF;
      --sbk-surface-dark: oklch(24% 7% 295deg);
      --sbk-input-dark: oklch(28% 9% 294deg);

      --sbk-text-muted-dark: rgba(254, 254, 254, 0.85);
      --sbk-text-subtle-dark: rgba(254, 254, 254, 0.85);
      --sbk-text-faint-dark: rgba(254, 254, 254, 0.85);

      --sbk-border-dark: var(--sbk-border-light);
      --sbk-border-soft-dark: oklch(37% 13% 294deg);
      --sbk-hover-dark: oklch(40% 20% 294deg);
      
      --sbk-primary-dark: var(--sbk-primary-light);
      --sbk-primary-hover-dark: var(--sbk-primary-hover-light);
      --sbk-primary-soft-dark: rgba(255, 254, 254, 0.1);
      --sbk-primary-soft-text-dark: var(--sbk-text-muted-dark);
      
      --sbk-aside-dark: oklch(57% 24% 178deg);
      --sbk-on-aside-dark: var(--sbk-on-aside-light);
      --sbk-aside-accent-dark: var(--sbk-aside-accent-light);
      --sbk-aside-muted-dark: var(--sbk-aside-muted-light);
      --sbk-aside-faint-dark: var(--sbk-aside-faint-light);

      --sbk-success-dark: var(--sbk-success-light);
      --sbk-neutral-dark: var(--sbk-neutral-light);
      --sbk-danger-bg-dark: var(--sbk-danger-bg-light);
      --sbk-danger-text-dark: var(--sbk-danger-text-light);
      --sbk-shadow-dark: var(--sbk-shadow-light);
      --sbk-ring-dark: var(--sbk-ring-light);

    /* -- Default to light mode variables -- */

      --sbk-page: var(--sbk-page-light);
      --sbk-text: var(--sbk-text-light);
      --sbk-surface: var(--sbk-surface-light);
      --sbk-input: var(--sbk-input-light);
      --sbk-text-muted: var(--sbk-text-muted-light);
      --sbk-text-subtle: var(--sbk-text-subtle-light);
      --sbk-text-faint: var(--sbk-text-faint-light);
      --sbk-border: var(--sbk-border-light);
      --sbk-border-soft: var(--sbk-border-soft-light);
      --sbk-hover: var(--sbk-hover-light);
      --sbk-primary: var(--sbk-primary-light);
      --sbk-primary-hover: var(--sbk-primary-hover-light);
      --sbk-primary-soft: var(--sbk-primary-soft-light);
      --sbk-primary-soft-text: var(--sbk-primary-soft-text-light);
      --sbk-aside: var(--sbk-aside-light);
      --sbk-on-aside: var(--sbk-on-aside-light);
      --sbk-aside-accent: var(--sbk-aside-accent-light);
      --sbk-aside-muted: var(--sbk-aside-muted-light);
      --sbk-aside-faint: var(--sbk-aside-faint-light);
      --sbk-success: var(--sbk-success-light);
      --sbk-neutral: var(--sbk-neutral-light);
      --sbk-danger-bg: var(--sbk-danger-bg-light);
      --sbk-danger-text: var(--sbk-danger-text-light);
      --sbk-shadow: var(--sbk-shadow-light);
      --sbk-ring: var(--sbk-ring-light);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --sbk-page: var(--sbk-page-dark);
        --sbk-text: var(--sbk-text-dark);
        --sbk-surface: var(--sbk-surface-dark);
        --sbk-input: var(--sbk-input-dark);
        --sbk-text-muted: var(--sbk-text-muted-dark);
        --sbk-text-subtle: var(--sbk-text-subtle-dark);
        --sbk-text-faint: var(--sbk-text-faint-dark);
        --sbk-border: var(--sbk-border-dark);
        --sbk-border-soft: var(--sbk-border-soft-dark);
        --sbk-hover: var(--sbk-hover-dark);
        --sbk-primary: var(--sbk-primary-dark);
        --sbk-primary-hover: var(--sbk-primary-hover-dark);
        --sbk-primary-soft: var(--sbk-primary-soft-dark);
        --sbk-primary-soft-text: var(--sbk-primary-soft-text-dark);
        --sbk-aside: var(--sbk-aside-dark);
        --sbk-on-aside: var(--sbk-on-aside-dark);
        --sbk-aside-accent: var(--sbk-aside-accent-dark);
        --sbk-aside-muted: var(--sbk-aside-muted-dark);
        --sbk-aside-faint: var(--sbk-aside-faint-dark);
        --sbk-success: var(--sbk-success-dark);
        --sbk-neutral: var(--sbk-neutral-dark);
        --sbk-danger-bg: var(--sbk-danger-bg-dark);
        --sbk-danger-text: var(--sbk-danger-text-dark);
        --sbk-shadow: var(--sbk-shadow-dark);
        --sbk-ring: var(--sbk-ring-dark);
      }
    }
  `}</style>;
}

export default function Survey() {
  const [stage, setStage] = useState(0);
  const [data, setData] = useState<FormData>(initial);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [draftStatus, setDraftStatus] = useState<"empty" | "saving" | "saved">("empty");
  const skipNextSave = useRef(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved) as Partial<FormData>;
        setData({
          ...initial,
          ...draft,
          location: { ...initial.location, ...draft.location },
          styles: migrateStyleKeys(draft.styles),
          learning: { ...initial.learning, ...draft.learning },
          favourites: { ...initial.favourites, ...draft.favourites },
          contact: { ...initial.contact, ...draft.contact },
        });
        setDraftStatus("saved");
      } catch {}
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    setDraftStatus("saving");
    const saveTimer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setDraftStatus("saved");
    }, 500);
    return () => window.clearTimeout(saveTimer);
  }, [data, ready]);

  const percent = useMemo(() => Math.round((stage / (stages.length - 1)) * 100), [stage]);
  const update = <K extends keyof FormData>(section: K, values: Partial<FormData[K]>) => setData(d => ({ ...d, [section]: { ...d[section], ...values } }));
  const next = () => {
    const form = document.querySelector("form");
    if (form && !form.reportValidity()) return;
    setStage(s => Math.min(stages.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => setStage(s => Math.max(0, s - 1));
  const clearDraft = () => {
    if (!window.confirm("Clear your saved answers and start the survey again?")) return;
    skipNextSave.current = true;
    localStorage.removeItem(STORAGE_KEY);
    setData(initial);
    setStage(0);
    setStatus("idle");
    setDraftStatus("empty");
  };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (stage < stages.length - 1) {
      next();
      return;
    }
    if (!e.currentTarget.reportValidity()) return;
    setStatus("sending");
    const response = await fetch("/api/survey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (response.ok) { setStatus("sent"); localStorage.removeItem(STORAGE_KEY); } else setStatus("error");
  }

  if (!ready) return null;
  if (status === "sent") return <><ThemeVariables /><main className="grid min-h-screen place-items-center bg-[var(--sbk-page)] p-6 text-[var(--sbk-text)]"><div className="max-w-xl rounded-[2rem] bg-[var(--sbk-surface)] p-10 shadow-xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--sbk-primary)]">Response received</p><h1 className="mt-3 text-4xl font-black">Thank you for adding your voice.</h1><p className="mt-4 text-lg text-[var(--sbk-text-muted)]">Your answers have been saved. Together, the results will help paint a more useful picture of our dance community.</p></div></main></>;

  return <><ThemeVariables /><main className="min-h-screen bg-[var(--sbk-page)] px-4 py-6 text-[var(--sbk-text)] sm:px-8 sm:py-10">
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="sr-only">the SBK survey</h1>
          <Image src="/logo-light.png" alt="" width={256} height={128} priority className="h-24 w-auto dark:hidden" />
          <Image src="/logo-dark.png" alt="" width={256} height={128} priority className="hidden h-24 w-auto dark:block" />
        </div>
        <div className="hidden grow md:block"><div className="mb-3 flex justify-between text-sm font-bold"><span>{stages[stage]}</span><span>{stage + 1} / {stages.length}</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--sbk-border-soft)]"><div className="h-full rounded-full bg-[var(--sbk-primary)] transition-all" style={{ width: `${percent}%` }} /></div></div>
        <div className="flex items-center gap-2 rounded-full bg-[var(--sbk-surface)] p-1.5 pl-4 text-sm shadow-sm ring-1 ring-[var(--sbk-ring)]">
          <span className="flex items-center gap-2 text-[var(--sbk-text-muted)]" role="status" aria-live="polite">
            <span className={`h-2 w-2 rounded-full ${draftStatus === "saving" ? "animate-pulse bg-[var(--sbk-primary)]" : draftStatus === "saved" ? "bg-[var(--sbk-success)]" : "bg-[var(--sbk-neutral)]"}`} />
            {draftStatus === "saving" ? "Saving…" : draftStatus === "saved" ? "Draft saved" : "No saved draft"}
          </span>
          <button type="button" onClick={clearDraft} disabled={draftStatus === "empty"} className="rounded-full px-3 py-1.5 font-bold text-[var(--sbk-text-subtle)] hover:bg-[var(--sbk-hover)] hover:text-[var(--sbk-text)] disabled:cursor-not-allowed disabled:opacity-40">
            Clear
          </button>
        </div>
      </header>
      <div className="mb-8 block md:hidden"><div className="mb-3 flex justify-between text-sm font-bold"><span>{stages[stage]}</span><span>{stage + 1} / {stages.length}</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--sbk-border-soft)]"><div className="h-full rounded-full bg-[var(--sbk-primary)] transition-all" style={{ width: `${percent}%` }} /></div></div>
      <form onSubmit={submit} className="overflow-hidden rounded-[2rem] bg-[var(--sbk-surface)] shadow-[0_24px_80px_var(--sbk-shadow)]">
        <div className="grid md:grid-cols-[.75fr_1.6fr]">
          <aside className="bg-[var(--sbk-aside)] p-8 text-[var(--sbk-on-aside)] md:p-10">
            <p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--sbk-aside-accent)]">Community survey</p>
            <h1 className="mt-4 text-4xl font-black leading-tight">Your dance life, in your words.</h1>
            { stage === 0 && <>
              <p className="mt-5 leading-relaxed text-[var(--sbk-aside-muted)]">A few thoughtful questions about where you dance, what you love, and how you learn.</p> 
              <h2 className="mt-5 text-md leading-relaxed text-[var(--sbk-aside-muted)] font-bold">Survey Duration</h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--sbk-aside-muted)]">About 5 minutes · Your progress stays on this device until you submit.</p>
            </>
            }
          </aside>
          <section className="p-7 sm:p-10 md:p-12">
            {stage === 0 && <Stage0 />}
            {stage === 1 && <Stage1 data={data} update={update} />}
            {stage === 2 && <Stage2 data={data} update={update} />}
            {stage === 3 && <Stage3 data={data} update={update} />}
            {stage === 4 && <Stage4 data={data} update={update} />}
            {stage === 5 && <Stage5 data={data} update={update} status={status} />}
            <div className="mt-10 flex items-center justify-between gap-4">
              {stage > 0 ? 
                <button type="button" onClick={back} className="rounded-full px-5 py-3 font-bold text-[var(--sbk-text-muted)] hover:bg-[var(--sbk-hover)]">Back</button> : 
                  <span />}{stage < stages.length - 1 ? 
                  <button key="continue" type="button" onClick={event => { event.preventDefault(); next(); }} className="rounded-full bg-[var(--sbk-primary)] px-7 py-3 font-bold text-[var(--sbk-on-aside)] hover:bg-[var(--sbk-primary-hover)]">Continue →</button> : 
                  <button key="submit" type="submit" disabled={status === "sending"} className="rounded-full bg-[var(--sbk-primary)] px-7 py-3 font-bold text-[var(--sbk-on-aside)] disabled:opacity-60">{status === "sending" ? "Submitting…" : "Submit survey"}</button>}
            </div>
          </section>
        </div>
      </form>
    </div>
  </main></>;
}

function Eyebrow({ children }: { children: React.ReactNode }) { 
  return <p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--sbk-primary)]">{children}</p>; 
}
function Title({ children }: { children: React.ReactNode }) { 
  return <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{children}</h2>; 
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { 
  return (
    <label className="mt-7 block">
      <span className="mb-2 block font-bold">{label}</span>
      <div className="[&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-[var(--sbk-border)] [&_input]:bg-[var(--sbk-input)] [&_input]:px-4 [&_input]:py-3 [&_input]:text-[var(--sbk-text)] [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-[var(--sbk-border)] [&_select]:bg-[var(--sbk-input)] [&_select]:px-4 [&_select]:py-3 [&_select]:text-[var(--sbk-text)]">
        {children}
      </div>
    </label>
  ); 
}

function Stage0() {
  return <div>
    <Eyebrow>Before we begin</Eyebrow>
    <Title>Help us understand the social dance community.</Title>
    <p className="mt-5 text-lg leading-relaxed text-[var(--sbk-text-muted)]">We&apos;re gathering a broad view of dancers&apos; interests, learning habits and favourite people, music and events. We plan to publish aggregated results so the community can learn from the bigger picture. Your individual answers and contact details will not be shown publicly.</p>
    <div className="mt-8 rounded-2xl bg-[var(--sbk-primary-soft)] p-5 text-[var(--sbk-primary-soft-text)]"><strong>Good to know:</strong> contact details are optional and only requested if you want the results and relevant event updates.</div>
  </div>;
}

function Stage1({ data, update }: StageProps) {
  return <div>
    <Eyebrow>Where are you from?</Eyebrow>
    <Title>Tell us about your corner of the world.</Title>
    <Field label="What country are you from?"><input required value={data.location.countryFrom} onChange={e => update("location", { countryFrom: e.target.value })} /></Field>
    <Field label="What country do you live in now?"><input required value={data.location.countryCurrent} onChange={e => update("location", { countryCurrent: e.target.value })} /></Field>
    <Field label={`What area of ${data.location.countryCurrent || "that place"} do you live in?`}><input required value={data.location.area} onChange={e => update("location", { area: e.target.value })} />
    </Field>
  </div>;
}

function Stage2({ data, update }: StageProps) {
  return <div>
    <Eyebrow>Types of dance</Eyebrow>
    <Title>Which styles interest you?</Title>
    <p className="mt-3 text-[var(--sbk-text-subtle)]">Start with each dance family. We’ll only ask about its substyles when you’re interested.</p>
    <div className="mt-8 space-y-5">
      {Object.entries(danceGroups).map(([group, styles]) => (
        <DanceCategory key={group} group={group} substyles={[...styles]} values={data.styles} onChange={values => update("styles", values)} />
      ))}
    </div>
  </div>;
}

type RadioCardOption = { value: string; label: string };

function RadioCards({ name, value, options, onChange }: { name: string; value: string; options: readonly RadioCardOption[]; onChange: (value: string) => void }) {
  return <div className="grid gap-2 sm:grid-cols-3">
    {options.map(option => (
      <label key={option.value} className={`cursor-pointer rounded-xl border p-3 text-center text-sm font-bold transition-colors ${value === option.value ? "border-[var(--sbk-primary)] bg-[var(--sbk-primary-soft)] text-[var(--sbk-primary-soft-text)]" : "border-[var(--sbk-border-soft)] bg-[var(--sbk-input)]"}`}>
        <input className="sr-only" type="radio" required name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
        {option.label}
      </label>
    ))}
  </div>;
}

function DanceCategory({ group, substyles, values, onChange }: { group: string; substyles: string[]; values: Record<string, string>; onChange: (values: Record<string, string>) => void }) {
  const shortcutValue = substyles.map(style => values[styleKey(group, style)]);
  const initialChoice = shortcutValue.every(value => value === categoryChoices[0].storedValue)
    ? "unknown"
    : shortcutValue.every(value => value === categoryChoices[1].storedValue)
      ? "not-interested"
      : shortcutValue.some(Boolean)
        ? "interested"
        : "";
  const [choice, setChoice] = useState(initialChoice);

  const chooseCategory = (nextChoice: string) => {
    setChoice(nextChoice);
    const shortcut = categoryChoices.find(option => option.value === nextChoice)?.storedValue;
    if (shortcut) {
      onChange(Object.fromEntries(substyles.map(style => [styleKey(group, style), shortcut])));
      return;
    }
    const shortcutAnswers = new Set<string>(categoryChoices.flatMap(option => option.storedValue ? [option.storedValue] : []));
    onChange(Object.fromEntries(substyles.map(style => {
      const key = styleKey(group, style);
      return [key, shortcutAnswers.has(values[key]) ? "" : values[key] || ""];
    })));
  };

  return <fieldset className="rounded-2xl border border-[var(--sbk-border-soft)] bg-[var(--sbk-surface)] p-4 sm:p-5">
    <legend className="px-1 text-xl font-black">{group}</legend>
    <RadioCards name={`category-${group}`} value={choice} options={categoryChoices} onChange={chooseCategory} />
    {choice === "interested" && <div className="mt-5 border-t border-[var(--sbk-border-soft)] pt-5">
      <RatingMatrix group={group} substyles={substyles} values={values} onChange={(style, rating) => onChange({ [styleKey(group, style)]: rating })} />
    </div>}
  </fieldset>;
}

function RatingMatrix({ group, substyles, values, onChange }: { group: string; substyles: string[]; values: Record<string, string>; onChange: (style: string, rating: string) => void }) {
  return <div>
    <p className="text-sm text-[var(--sbk-text-subtle)]">Rate each substyle from 1 to 5.</p>
    <ol className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--sbk-text-subtle)]">
      {substyleScale.map((rating, index) => <li key={rating.value}><strong className="text-[var(--sbk-text)]">{index + 1}</strong> {rating.shortLabel}</li>)}
    </ol>
    <div className="mt-4 space-y-3">
      {substyles.map(style => {
        const key = styleKey(group, style);
        return <fieldset key={style} className="rounded-xl border border-[var(--sbk-border-soft)] bg-[var(--sbk-input)] p-3">
        <legend className="px-1 font-bold">{style}</legend>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {substyleScale.map((rating, index) => <label key={rating.value} title={rating.value} className={`grid min-h-11 cursor-pointer place-items-center rounded-lg border transition-colors ${values[key] === rating.value ? "border-[var(--sbk-primary)] bg-[var(--sbk-primary-soft)]" : "border-[var(--sbk-border)] hover:bg-[var(--sbk-hover)]"}`}>
              <input className="sr-only" type="radio" required name={`substyle-${group}-${style}`} value={rating.value} checked={values[key] === rating.value} onChange={() => onChange(style, rating.value)} />
              <span aria-hidden="true" className={`grid h-7 w-7 place-items-center rounded-full text-sm font-bold ${values[key] === rating.value ? "bg-[var(--sbk-primary)] text-[var(--sbk-on-aside)]" : ""}`}>{index + 1}</span>
              <span className="sr-only">{style}: {rating.value}</span>
            </label>)}
        </div>
      </fieldset>})}
    </div>
  </div>;
}

function Stage3({ data, update }: StageProps) {
  const weeklyActivities = [
    ["teacher", "Learn with a teacher"],
    ["practice", "Practise actively"],
    ["social", "Social dance"],
  ] as const;

  return <div>
    <Eyebrow>Your learning & development</Eyebrow>
    <Title>What does a typical dance week look like?</Title>
    <div className="mt-8 space-y-6">
      {weeklyActivities.map(([key, label]) => (
        <label key={key} className="block">
          <span className="flex justify-between font-bold">
            <span>{label}</span>
            <span>{data.learning[key]} times</span>
          </span>
          <input className="mt-3 w-full accent-[var(--sbk-primary)]" type="range" min="0" max="7" value={data.learning[key]} onChange={e => update("learning", { [key]: Number(e.target.value) })} />
        </label>
      ))}
    </div>
    <Field label="What do you expect to pay for a one-hour lesson?">
      <div className="flex">
        <select aria-label="Lesson currency" className="!w-auto !rounded-r-none border-r-0 font-bold" value={data.learning.lessonCurrency} onChange={e => update("learning", { lessonCurrency: e.target.value })}>
          <option value="GBP">£</option>
          <option value="EUR">€</option>
          <option value="USD">$</option>
          <option value="CAD">C$</option>
          <option value="AUD">A$</option>
        </select>
        <input required type="number" min="0" step="0.01" className="!rounded-l-none" value={data.learning.lessonPrice} onChange={e => update("learning", { lessonPrice: e.target.value })} placeholder="Amount" />
      </div>
    </Field>
    <Field label="Where do you learn the most?">
      <select required value={data.learning.learningSource} onChange={e => update("learning", { learningSource: e.target.value })}>
        <option value="">Choose one…</option>
        <option>Online — social media</option>
        <option>Online — classes</option>
        <option>Local classes</option>
        <option>Workshops / Congresses</option>
        <option>Other</option>
      </select>
    </Field>
    <Field label="How many congresses do you attend in an average year?">
      <input required type="number" min="0" value={data.learning.congresses} onChange={e => update("learning", { congresses: e.target.value })} />
    </Field>
  </div>;
}

function Stage4({ data, update }: StageProps) {
  return <div>
    <Eyebrow>What’s your favourite?</Eyebrow>
    <Title>Share the names you’d recommend.</Title>
    <Field label="Favourite teacher or artist">
      <input  value={data.favourites.teacher} onChange={e => update("favourites", { teacher: e.target.value })} />
    </Field>
    <Field label="Favourite congress or event">
      <input  value={data.favourites.event} onChange={e => update("favourites", { event: e.target.value })} />
    </Field>
    <Field label="Favourite song or band">
      <input  value={data.favourites.song} onChange={e => update("favourites", { song: e.target.value })} />
    </Field>
  </div>;
}

function Stage5({ data, update, status }: StageProps & { status: "idle" | "sending" | "sent" | "error" }) {
  return <div>
    <Eyebrow>Contact</Eyebrow>
    <Title>Would you like to hear what we learn?</Title>
    <fieldset className="mt-8">
      <legend className="mb-3 font-bold">Send me the survey results and relevant event updates</legend>
      <div className="grid grid-cols-2 gap-3">
        {["Yes", "No"].map(option => (
          <label key={option} className={`cursor-pointer rounded-2xl border p-4 text-center font-bold ${data.contact.wantsUpdates === option ? "border-[var(--sbk-primary)] bg-[var(--sbk-primary-soft)]" : "border-[var(--sbk-border-soft)]"}`}>
            <input className="sr-only" type="radio" required name="updates" value={option} checked={data.contact.wantsUpdates === option} onChange={e => update("contact", { wantsUpdates: e.target.value })} />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
    {data.contact.wantsUpdates === "Yes" && <div className="mt-4">
      <Field label="Name">
        <input required value={data.contact.name} onChange={e => update("contact", { name: e.target.value })} />
      </Field>
      <Field label="Email">
        <input required type="email" value={data.contact.email} onChange={e => update("contact", { email: e.target.value })} />
      </Field>
      <Field label="Phone (optional)">
        <input type="tel" value={data.contact.phone} onChange={e => update("contact", { phone: e.target.value })} />
      </Field>
    </div>}
    {status === "error" && <p className="mt-5 rounded-xl bg-[var(--sbk-danger-bg)] p-4 text-[var(--sbk-danger-text)]">We couldn’t submit your answers. Your draft is safe on this device—please try again.</p>}
  </div>;
}
