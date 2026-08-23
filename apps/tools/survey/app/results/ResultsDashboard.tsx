"use client";

import { useEffect, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import world from "world-atlas/countries-110m.json";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AverageResult, CountResult, SurveyResults } from "../lib/survey-results";

const colours = ["#d61976", "#169c87", "#b4d52f", "#7c5cff", "#ef8c2f", "#2f75ef"];
const styleStackColours = ["#2563eb", "#0891b2", "#10b981", "#eab308", "#f97316", "#dc2626"];
const tooltipStyle = { borderRadius: 12, border: "1px solid var(--sbk-border)", background: "var(--sbk-surface)", color: "var(--sbk-text)" };
const responsePercentage = (count: number, total: number) => total ? Math.round((count / total) * 100) : 0;

function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-[1.5rem] bg-[var(--sbk-surface)] p-5 shadow-[0_14px_40px_var(--sbk-shadow)] sm:p-7">
    <h2 className="text-xl font-black">{title}</h2>
    <p className="mt-1 text-sm text-[var(--sbk-text-muted)]">{description}</p>
    <div className="mt-5 h-80">{children}</div>
  </section>;
}

function CountBars({ data }: { data: CountResult[] }) {
  return <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} layout="vertical" margin={{ left: 10, right: 36 }}>
      <CartesianGrid stroke="var(--sbk-border-soft)" horizontal={false} />
      <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--sbk-text-muted)", fontSize: 12 }} />
      <YAxis dataKey="name" type="category" width={105} tick={{ fill: "var(--sbk-text)", fontSize: 12 }} />
      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--sbk-hover)" }} />
      <Bar dataKey="count" name="Responses" fill={colours[1]} radius={[0, 8, 8, 0]}>
        <LabelList dataKey="count" position="right" fill="var(--sbk-text)" fontSize={12} />
      </Bar>
    </BarChart>
  </ResponsiveContainer>;
}

const canonicalMapNames: Record<string, string> = {
  "united states of america": "united states",
  "dem rep congo": "congo kinshasa",
  "democratic republic of the congo": "congo kinshasa",
  congo: "congo brazzaville",
  "republic of the congo": "congo brazzaville",
};

function countryMapKey(name: string) {
  const normalised = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (
    (normalised.includes("china") && normalised.includes("mainland")) ||
    normalised === "peoples republic of china"
  ) return "china";

  return canonicalMapNames[normalised] ?? normalised;
}

const worldCountries = feature(
  world as never,
  world.objects.countries as never,
) as unknown as FeatureCollection<Geometry, { name: string }>;
const visibleWorldCountries: FeatureCollection<Geometry, { name: string }> = {
  ...worldCountries,
  features: worldCountries.features.filter(country => country.properties?.name !== "Antarctica"),
};
const worldPath = geoPath(geoNaturalEarth1().fitExtent([[8, 8], [792, 332]], visibleWorldCountries));

function CountryMap({ data, total }: { data: CountResult[]; total: number }) {
  const counts = new Map<string, number>();
  for (const item of data) {
    const key = countryMapKey(item.name);
    counts.set(key, (counts.get(key) ?? 0) + item.count);
  }
  const maximum = Math.max(...data.map(item => item.count), 1);
  const topCountries = data.slice(0, 5);

  return <div className="flex h-full flex-col">
    <svg viewBox="0 0 800 340" className="min-h-0 w-full grow" role="img" aria-label="World map shaded by response count">
      {visibleWorldCountries.features.map(country => {
        const mapName = country.properties?.name ?? "Unknown";
        const mapKey = countryMapKey(mapName);
        const matchingResponse = data.find(item => countryMapKey(item.name) === mapKey);
        const surveyName = matchingResponse?.name ?? mapName;
        const count = counts.get(mapKey) ?? 0;
        const intensity = count ? 0.28 + (count / maximum) * 0.72 : 0;
        return <path
          key={`${country.id}-${mapName}`}
          d={worldPath(country) ?? undefined}
          fill={count ? `color-mix(in srgb, ${colours[1]} ${Math.round(intensity * 100)}%, var(--sbk-surface))` : "var(--sbk-border-soft)"}
          stroke="var(--sbk-surface)"
          strokeWidth={0.7}
          className="transition-opacity hover:opacity-75"
        >
          <title>{surveyName}: {responsePercentage(count, total)}% of responses</title>
        </path>;
      })}
    </svg>
    <div className="mt-2 flex items-center justify-end gap-2 text-xs text-[var(--sbk-text-muted)]">
      <span>Fewer</span><span className="h-2.5 w-20 rounded-full" style={{ background: `linear-gradient(to right, color-mix(in srgb, ${colours[1]} 28%, var(--sbk-surface)), ${colours[1]})` }} /><span>More</span>
    </div>
    <ol className="mt-4 grid gap-x-5 gap-y-2 border-t border-[var(--sbk-border-soft)] pt-4 sm:grid-cols-2">
      {topCountries.map((country, index) => {
        const percentage = responsePercentage(country.count, total);
        return <li key={country.name} className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-2 text-xs">
          <span className="font-black text-[var(--sbk-text-muted)]">{index + 1}</span>
          <span className="min-w-0">
            <span className="block truncate font-bold" title={country.name}>{country.name}</span>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[var(--sbk-border-soft)]"><span className="block h-full rounded-full bg-[#169c87]" style={{ width: `${percentage}%` }} /></span>
          </span>
          <span className="font-black text-[var(--sbk-text)]">{percentage}%</span>
        </li>;
      })}
    </ol>
  </div>;
}

function AverageBars({ data, max, labelWidth = 112 }: { data: AverageResult[]; max: number; labelWidth?: number }) {
  return <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} layout="vertical" margin={{ left: 12, right: 42 }}>
      <CartesianGrid stroke="var(--sbk-border-soft)" horizontal={false} />
      <XAxis type="number" domain={[0, max]} tick={{ fill: "var(--sbk-text-muted)", fontSize: 12 }} />
      <YAxis dataKey="name" type="category" width={labelWidth} tick={{ fill: "var(--sbk-text)", fontSize: 12 }} />
      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--sbk-hover)" }} formatter={(value) => [Number(value).toFixed(1), "Average"]} />
      <Bar dataKey="average" name="Average" fill={colours[0]} radius={[0, 8, 8, 0]}>
        <LabelList dataKey="average" position="right" fill="var(--sbk-text)" fontSize={12} />
      </Bar>
    </BarChart>
  </ResponsiveContainer>;
}

function MusicPolicyResults({ averageRatio, data, total }: { averageRatio: string; data: CountResult[]; total: number }) {
  const chartHeight = Math.max(280, data.length * 36);
  const percentageData = data.map(item => ({ ...item, percentage: responsePercentage(item.count, total) }));

  return <section className="rounded-[1.5rem] bg-[var(--sbk-surface)] p-5 shadow-[0_14px_40px_var(--sbk-shadow)] sm:p-7 lg:col-span-2">
    <h2 className="text-xl font-black">Favourite event mix</h2>
    <p className="mt-1 text-sm text-[var(--sbk-text-muted)]">Salsa:Bachata:Kizomba music policy</p>
    <div className="mt-7 grid gap-7 lg:grid-cols-[.75fr_1.25fr] lg:gap-8">
      <div className="grid min-h-64 place-items-center py-6 text-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.16em] text-[var(--sbk-text-muted)]">Average policy</p>
          <p className="mt-3 text-6xl font-black tracking-tight text-[var(--sbk-primary)] sm:text-7xl">{averageRatio}</p>
          <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-5 text-sm font-bold text-[var(--sbk-text-muted)]">
            {["Salsa", "Bachata", "Kizomba"].map((style, index) => <div key={style}>
              <span className="mx-auto mb-2 block h-2 w-10 rounded-full" style={{ backgroundColor: colours[index] }} />
              {style}
            </div>)}
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--sbk-border-soft)] pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
        <h3 className="font-black">Combined responses</h3>
        <p className="mt-1 text-sm text-[var(--sbk-text-muted)]">Percentage of respondents who selected each exact policy</p>
        {data.length ? <div className="mt-5 max-h-[36rem] overflow-y-auto pr-2">
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={percentageData} layout="vertical" margin={{ left: 6, right: 48 }}>
                <CartesianGrid stroke="var(--sbk-border-soft)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={value => `${value}%`} tick={{ fill: "var(--sbk-text-muted)", fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={64} tick={{ fill: "var(--sbk-text)", fontSize: 12, fontWeight: 700 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--sbk-hover)" }} formatter={value => [`${value}%`, "Responses"]} />
                <Bar dataKey="percentage" name="Responses" fill={colours[3]} radius={[0, 8, 8, 0]}>
                  <LabelList dataKey="percentage" position="right" formatter={(value: unknown) => `${value}%`} fill="var(--sbk-text)" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div> : <p className="mt-5 text-sm text-[var(--sbk-text-muted)]">No music policies have been submitted yet.</p>}
      </div>
    </div>
  </section>;
}

function SpendingChart({ data, dataKey, name, responseKey, total }: {
  data: SurveyResults["spendingByCurrency"];
  dataKey: "lessonPrice" | "monthlySpend";
  name: string;
  responseKey: "lessonResponses" | "monthlyResponses";
  total: number;
}) {
  return <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ left: 4, right: 10, top: 10 }}>
      <CartesianGrid stroke="var(--sbk-border-soft)" vertical={false} />
      <XAxis dataKey="currency" tick={{ fill: "var(--sbk-text)", fontSize: 12, fontWeight: 700 }} />
      <YAxis tick={{ fill: "var(--sbk-text-muted)", fontSize: 12 }} />
      <Tooltip
        contentStyle={tooltipStyle}
        cursor={{ fill: "var(--sbk-hover)" }}
        formatter={(value, seriesName, item) => [`${item.payload.currency} ${Number(value).toFixed(2)} (${responsePercentage(item.payload[responseKey], total)}% answered)`, seriesName]}
      />
      <Bar dataKey={dataKey} name={name} fill={dataKey === "lessonPrice" ? colours[0] : colours[1]} radius={[7, 7, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>;
}

const styleAnswerTitles: Record<string, string> = {
  "Not for me / Not interested": "Not for me / not interested",
  "Don't know about this style": "Don’t know about",
  "Not interested": "Not interested in",
  "Not for me": "Not for me",
  Curious: "Curious about",
  "Want to learn": "Want to learn",
  "Learning or dancing": "Learning or dancing",
  "A favourite": "Favourite dances",
};

function StyleBreakdown({ data, total }: { data: SurveyResults["styleBreakdown"]; total: number }) {
  const answerGroups = [
    { answer: "Not for me / Not interested", sources: ["Not for me", "Not interested"] },
    { answer: "Don't know about this style", sources: ["Don't know about this style"] },
    { answer: "Curious", sources: ["Curious"] },
    { answer: "Want to learn", sources: ["Want to learn"] },
    { answer: "Learning or dancing", sources: ["Learning or dancing"] },
    { answer: "A favourite", sources: ["A favourite"] },
  ];
  const styles = [...new Set(data.flatMap(group => group.styles.map(style => style.name)))].sort();
  const countFor = (answer: string, style: string) => data
    .find(group => group.answer === answer)?.styles.find(item => item.name === style)?.count ?? 0;
  const chartData = styles.map(style => {
    const row: Record<string, string | number> = { danceStyle: style };
    for (const group of answerGroups) {
      const count = group.sources.reduce((sum, answer) => sum + countFor(answer, style), 0);
      row[group.answer] = responsePercentage(count, total);
    }
    return row;
  });
  const chartHeight = Math.max(540, styles.length * 38);

  return <section className="rounded-[1.5rem] bg-[var(--sbk-surface)] p-5 shadow-[0_14px_40px_var(--sbk-shadow)] sm:p-7 lg:col-span-2">
    <h2 className="text-xl font-black">Dance-style breakdown</h2>
    <p className="mt-1 text-sm text-[var(--sbk-text-muted)]">Answer distribution for every style, shown as a percentage of all respondents. Each answer is counted only in its selected category.</p>
    {chartData.length ? <div className="mt-7 overflow-x-auto">
      <div className="mb-4 flex min-w-[760px] flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
        {answerGroups.map((group, index) => <span key={group.answer} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: styleStackColours[index] }} />
          {styleAnswerTitles[group.answer] ?? group.answer}
        </span>)}
      </div>
      <div style={{ height: chartHeight, minWidth: 760 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 24, top: 20, bottom: 10 }}>
            <CartesianGrid stroke="var(--sbk-border-soft)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tickFormatter={value => `${value}%`} tick={{ fill: "var(--sbk-text-muted)", fontSize: 11 }} />
            <YAxis dataKey="danceStyle" type="category" width={165} tick={{ fill: "var(--sbk-text)", fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--sbk-hover)" }} formatter={(value, name) => [`${value}%`, styleAnswerTitles[String(name)] ?? name]} />
            {answerGroups.map((group, index) => <Bar key={group.answer} dataKey={group.answer} stackId="styles" fill={styleStackColours[index]} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div> : <p className="mt-5 text-sm text-[var(--sbk-text-muted)]">No dance-style responses have been submitted yet.</p>}
  </section>;
}

export default function ResultsDashboard() {
  const [results, setResults] = useState<SurveyResults | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/survey/results", { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Results request failed");
        return response.json() as Promise<SurveyResults>;
      })
      .then(setResults)
      .catch(requestError => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError("We couldn't load the results right now. Please try again shortly.");
      });
    return () => controller.abort();
  }, []);

  if (error) return <div className="rounded-2xl bg-[var(--sbk-danger-bg)] p-6 text-[var(--sbk-danger-text)]">{error}</div>;
  if (!results) return <div className="grid min-h-64 place-items-center rounded-[2rem] bg-[var(--sbk-surface)] text-[var(--sbk-text-muted)]" role="status">Loading community results…</div>;
  if (results.totalResponses === 0) return <div className="rounded-[2rem] bg-[var(--sbk-surface)] p-10 text-center"><h2 className="text-2xl font-black">The first results are on their way.</h2><p className="mt-2 text-[var(--sbk-text-muted)]">No survey responses have been submitted yet.</p></div>;

  const eventMixRatio = results.musicMix.length === 3
    ? results.musicMix.map(style => Math.round(style.average)).join(":")
    : "–:–:–";

  return <>
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl bg-[var(--sbk-aside)] p-6 text-[var(--sbk-on-aside)]"><p className="text-sm font-bold uppercase tracking-wider text-[var(--sbk-aside-accent)]">Community voices</p><p className="mt-2 text-5xl font-black">{results.totalResponses}</p><p className="mt-1 text-sm text-[var(--sbk-aside-muted)]">completed responses</p></div>
      <div className="rounded-2xl bg-[var(--sbk-surface)] p-6 shadow-sm"><p className="text-sm font-bold text-[var(--sbk-text-muted)]">Congresses per year</p><p className="mt-2 text-4xl font-black">{results.averageCongresses ?? "—"}</p><p className="mt-1 text-sm text-[var(--sbk-text-muted)]">average attendance</p></div>
      <div className="rounded-2xl bg-[var(--sbk-surface)] p-6 shadow-sm"><p className="text-sm font-bold text-[var(--sbk-text-muted)]">Latest response</p><p className="mt-3 text-xl font-black">{results.latestSubmission ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(results.latestSubmission)) : "—"}</p><p className="mt-2 text-sm text-[var(--sbk-text-muted)]">dashboard refreshes every few minutes</p></div>
    </div>

    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <ChartCard title="Where dancers live" description="Countries shaded by current residence; hover for percentage of responses"><CountryMap data={results.currentCountries} total={results.totalResponses} /></ChartCard>
      <ChartCard title="Where dancers grew up" description="Countries represented in the community; hover for percentage of responses"><CountryMap data={results.homeCountries} total={results.totalResponses} /></ChartCard>
      <ChartCard title="A typical dance week" description="Average sessions per person, from 0 to 7"><AverageBars data={results.weeklyActivities} max={7} /></ChartCard>
      <div className="grid gap-6 sm:grid-cols-2">
        <ChartCard title="Lesson price" description="Average expected hourly lesson price, separated by currency">
          {results.spendingByCurrency.some(item => item.lessonPrice !== null) ? <SpendingChart data={results.spendingByCurrency} dataKey="lessonPrice" name="Lesson price / hour" responseKey="lessonResponses" total={results.totalResponses} /> : <div className="grid h-full place-items-center text-sm text-[var(--sbk-text-muted)]">No lesson-price answers have been submitted yet.</div>}
        </ChartCard>
        <ChartCard title="Monthly dance spend" description="Average monthly spending on dancing, separated by currency">
          {results.spendingByCurrency.some(item => item.monthlySpend !== null) ? <SpendingChart data={results.spendingByCurrency} dataKey="monthlySpend" name="Monthly dance spend" responseKey="monthlyResponses" total={results.totalResponses} /> : <div className="grid h-full place-items-center text-sm text-[var(--sbk-text-muted)]">No monthly-spend answers have been submitted yet.</div>}
        </ChartCard>
      </div>
      <MusicPolicyResults averageRatio={eventMixRatio} data={results.musicPolicies} total={results.totalResponses} />
      <ChartCard title="Most-loved dance styles" description="Highest average interest score, from 1 to 5"><AverageBars data={results.danceStyles} max={5} labelWidth={190} /></ChartCard>
      <ChartCard title="Where people learn most" description="Primary learning source selected by respondents">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart><Pie data={results.learningSources.map(item => ({ ...item, percentage: responsePercentage(item.count, results.totalResponses) }))} dataKey="percentage" nameKey="name" innerRadius="48%" outerRadius="76%" paddingAngle={2} label={({ name, value }) => `${name} ${value}%`} labelLine={false}>{results.learningSources.map((item, index) => <Cell key={item.name} fill={colours[index % colours.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={value => [`${value}%`, "Responses"]} /></PieChart>
        </ResponsiveContainer>
      </ChartCard>
      <StyleBreakdown data={results.styleBreakdown} total={results.totalResponses} />
    </div>
    <p className="mt-8 text-center text-sm text-[var(--sbk-text-muted)]">Only combined, anonymous answers are shown here. Individual responses and contact details are never included.</p>
  </>;
}
