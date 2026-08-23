export type CountResult = { name: string; count: number };
export type AverageResult = { name: string; average: number; responses: number };

export type SurveyResults = {
  totalResponses: number;
  latestSubmission: string | null;
  currentCountries: CountResult[];
  homeCountries: CountResult[];
  learningSources: CountResult[];
  weeklyActivities: AverageResult[];
  danceStyles: AverageResult[];
  musicMix: AverageResult[];
  averageCongresses: number | null;
};

type JsonObject = Record<string, unknown>;

const styleScores: Record<string, number> = {
  "Not for me": 1,
  Curious: 2,
  "Want to learn": 3,
  "Learning or dancing": 4,
  "A favourite": 5,
};

function objectValue(value: unknown): JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function increment(counts: Map<string, number>, value: unknown) {
  const name = textValue(value);
  if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
}

function topCounts(counts: Map<string, number>, limit = 10): CountResult[] {
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function averages(values: Map<string, number[]>, order?: string[]): AverageResult[] {
  const results = [...values.entries()].map(([name, entries]) => ({
    name,
    average: Number((entries.reduce((sum, value) => sum + value, 0) / entries.length).toFixed(1)),
    responses: entries.length,
  }));

  return order
    ? results.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
    : results.sort((a, b) => b.average - a.average || b.responses - a.responses);
}

export function aggregateSurveyResults(items: JsonObject[]): SurveyResults {
  const currentCountries = new Map<string, number>();
  const homeCountries = new Map<string, number>();
  const learningSources = new Map<string, number>();
  const weeklyActivities = new Map<string, number[]>([
    ["Teacher-led learning", []],
    ["Active practice", []],
    ["Social dancing", []],
  ]);
  const danceStyles = new Map<string, number[]>();
  const musicMix = new Map<string, number[]>([
    ["Salsa", []],
    ["Bachata", []],
    ["Kizomba", []],
  ]);
  const congresses: number[] = [];
  let latestSubmission: string | null = null;

  for (const item of items) {
    const submittedAt = textValue(item.submittedAt);
    if (submittedAt && (!latestSubmission || submittedAt > latestSubmission)) latestSubmission = submittedAt;

    const location = objectValue(item.location);
    increment(currentCountries, location.countryCurrent);
    increment(homeCountries, location.countryFrom);

    const learning = objectValue(item.learning);
    increment(learningSources, learning.learningSource);
    const weeklyFields = [
      ["Teacher-led learning", learning.teacher],
      ["Active practice", learning.practice],
      ["Social dancing", learning.social],
    ] as const;
    for (const [label, rawValue] of weeklyFields) {
      const value = numberValue(rawValue);
      if (value !== null) weeklyActivities.get(label)!.push(value);
    }
    const congressCount = numberValue(learning.congresses);
    if (congressCount !== null) congresses.push(congressCount);

    for (const [name, rating] of Object.entries(objectValue(item.styles))) {
      const score = styleScores[textValue(rating)];
      if (score) {
        const displayName = name.replace(/^[^:]+:\s*/, "");
        danceStyles.set(displayName, [...(danceStyles.get(displayName) ?? []), score]);
      }
    }

    const music = objectValue(objectValue(item.favourites).musicMix);
    const mixFields = [["Salsa", music.salsa], ["Bachata", music.bachata], ["Kizomba", music.kizomba]] as const;
    for (const [label, rawValue] of mixFields) {
      const value = numberValue(rawValue);
      if (value !== null) musicMix.get(label)!.push(value);
    }
  }

  return {
    totalResponses: items.length,
    latestSubmission,
    currentCountries: topCounts(currentCountries),
    homeCountries: topCounts(homeCountries),
    learningSources: topCounts(learningSources),
    weeklyActivities: averages(weeklyActivities, ["Teacher-led learning", "Active practice", "Social dancing"]),
    danceStyles: averages(danceStyles).slice(0, 12),
    musicMix: averages(musicMix, ["Salsa", "Bachata", "Kizomba"]),
    averageCongresses: congresses.length
      ? Number((congresses.reduce((sum, value) => sum + value, 0) / congresses.length).toFixed(1))
      : null,
  };
}
