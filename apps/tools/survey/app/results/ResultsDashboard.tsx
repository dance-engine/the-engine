"use client";

import { useEffect, useState } from "react";
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

const colours = ["#d61976", "#169c87", "#b4d52f", "#7c5cff", "#ef8c2f"];
const tooltipStyle = { borderRadius: 12, border: "1px solid var(--sbk-border)", background: "var(--sbk-surface)", color: "var(--sbk-text)" };

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

function MusicPolicyResults({ averageRatio, data }: { averageRatio: string; data: CountResult[] }) {
  const chartHeight = Math.max(280, data.length * 36);

  return <section className="rounded-[1.5rem] bg-[var(--sbk-surface)] p-5 shadow-[0_14px_40px_var(--sbk-shadow)] sm:p-7 lg:col-span-2">
    <h2 className="text-xl font-black">Favourite event mix</h2>
    <p className="mt-1 text-sm text-[var(--sbk-text-muted)]">Salsa:Bachata:Kizomba music policy</p>
    <div className="py-10 text-center">
      <p className="text-sm font-bold uppercase tracking-[.16em] text-[var(--sbk-text-muted)]">Average policy</p>
      <p className="mt-3 text-6xl font-black tracking-tight text-[var(--sbk-primary)] sm:text-7xl">{averageRatio}</p>
      <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-5 text-sm font-bold text-[var(--sbk-text-muted)]">
        {["Salsa", "Bachata", "Kizomba"].map((style, index) => <div key={style}>
          <span className="mx-auto mb-2 block h-2 w-10 rounded-full" style={{ backgroundColor: colours[index] }} />
          {style}
        </div>)}
      </div>
    </div>
    <div className="border-t border-[var(--sbk-border-soft)] pt-7">
      <h3 className="font-black">Combined responses</h3>
      <p className="mt-1 text-sm text-[var(--sbk-text-muted)]">Number of dancers who selected each exact policy</p>
      {data.length ? <div className="mt-5 max-h-[36rem] overflow-y-auto pr-2">
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 6, right: 42 }}>
              <CartesianGrid stroke="var(--sbk-border-soft)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fill: "var(--sbk-text-muted)", fontSize: 12 }} />
              <YAxis dataKey="name" type="category" width={64} tick={{ fill: "var(--sbk-text)", fontSize: 12, fontWeight: 700 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--sbk-hover)" }} />
              <Bar dataKey="count" name="People" fill={colours[3]} radius={[0, 8, 8, 0]}>
                <LabelList dataKey="count" position="right" fill="var(--sbk-text)" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div> : <p className="mt-5 text-sm text-[var(--sbk-text-muted)]">No music policies have been submitted yet.</p>}
    </div>
  </section>;
}

function SpendingChart({ data, dataKey, name, responseKey }: {
  data: SurveyResults["spendingByCurrency"];
  dataKey: "lessonPrice" | "monthlySpend";
  name: string;
  responseKey: "lessonResponses" | "monthlyResponses";
}) {
  return <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ left: 4, right: 10, top: 10 }}>
      <CartesianGrid stroke="var(--sbk-border-soft)" vertical={false} />
      <XAxis dataKey="currency" tick={{ fill: "var(--sbk-text)", fontSize: 12, fontWeight: 700 }} />
      <YAxis tick={{ fill: "var(--sbk-text-muted)", fontSize: 12 }} />
      <Tooltip
        contentStyle={tooltipStyle}
        cursor={{ fill: "var(--sbk-hover)" }}
        formatter={(value, seriesName, item) => [`${item.payload.currency} ${Number(value).toFixed(2)} (${item.payload[responseKey]} responses)`, seriesName]}
      />
      <Bar dataKey={dataKey} name={name} fill={dataKey === "lessonPrice" ? colours[0] : colours[1]} radius={[7, 7, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>;
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
      <ChartCard title="Where dancers live" description="Top countries by current residence"><CountBars data={results.currentCountries} /></ChartCard>
      <ChartCard title="Where dancers grew up" description="Top countries represented in the community"><CountBars data={results.homeCountries} /></ChartCard>
      <ChartCard title="A typical dance week" description="Average sessions per person, from 0 to 7"><AverageBars data={results.weeklyActivities} max={7} /></ChartCard>
      <div className="grid gap-6 sm:grid-cols-2">
        <ChartCard title="Lesson price" description="Average expected hourly lesson price, separated by currency">
          {results.spendingByCurrency.some(item => item.lessonPrice !== null) ? <SpendingChart data={results.spendingByCurrency} dataKey="lessonPrice" name="Lesson price / hour" responseKey="lessonResponses" /> : <div className="grid h-full place-items-center text-sm text-[var(--sbk-text-muted)]">No lesson-price answers have been submitted yet.</div>}
        </ChartCard>
        <ChartCard title="Monthly dance spend" description="Average monthly spending on dancing, separated by currency">
          {results.spendingByCurrency.some(item => item.monthlySpend !== null) ? <SpendingChart data={results.spendingByCurrency} dataKey="monthlySpend" name="Monthly dance spend" responseKey="monthlyResponses" /> : <div className="grid h-full place-items-center text-sm text-[var(--sbk-text-muted)]">No monthly-spend answers have been submitted yet.</div>}
        </ChartCard>
      </div>
      <MusicPolicyResults averageRatio={eventMixRatio} data={results.musicPolicies} />
      <ChartCard title="Most-loved dance styles" description="Highest average interest score, from 1 to 5"><AverageBars data={results.danceStyles} max={5} labelWidth={190} /></ChartCard>
      <ChartCard title="Where people learn most" description="Primary learning source selected by respondents">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart><Pie data={results.learningSources} dataKey="count" nameKey="name" innerRadius="48%" outerRadius="76%" paddingAngle={2} label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`} labelLine={false}>{results.learningSources.map((item, index) => <Cell key={item.name} fill={colours[index % colours.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
    <p className="mt-8 text-center text-sm text-[var(--sbk-text-muted)]">Only combined, anonymous answers are shown here. Individual responses and contact details are never included.</p>
  </>;
}
