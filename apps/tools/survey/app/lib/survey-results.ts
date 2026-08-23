export type CountResult = { name: string; count: number };
export type AverageResult = { name: string; average: number; responses: number };
export type SpendingResult = {
  currency: string;
  lessonPrice: number | null;
  lessonResponses: number;
  monthlySpend: number | null;
  monthlyResponses: number;
};
export type StyleBreakdownResult = { answer: string; styles: CountResult[] };

export type SurveyResults = {
  totalResponses: number;
  latestSubmission: string | null;
  currentCountries: CountResult[];
  homeCountries: CountResult[];
  learningSources: CountResult[];
  weeklyActivities: AverageResult[];
  danceStyles: AverageResult[];
  styleBreakdown: StyleBreakdownResult[];
  musicMix: AverageResult[];
  musicPolicies: CountResult[];
  spendingByCurrency: SpendingResult[];
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
const styleAnswerOrder = [
  "Don't know about this style",
  "Not interested",
  "Not for me",
  "Curious",
  "Want to learn",
  "Learning or dancing",
  "A favourite",
];
const danceSubstyles: Record<string, string[]> = {
  Salsa: ["Cuban", "Rueda", "LA", "New York"],
  Bachata: ["Dominican", "Moderna", "Sensual"],
  Kizomba: ["Traditional", "UrbanKiz", "Semba", "Tarraxinha"],
  Other: ["Son", "Cha Cha", "Zouk", "Compa", "Merengue"],
};
const danceStyleOrder = Object.entries(danceSubstyles).flatMap(([category, substyles]) =>
  substyles.map(substyle => `${category}: ${substyle}`),
);

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
  const names = order
    ? [...order, ...[...values.keys()].filter(name => !order.includes(name))]
    : [...values.keys()];
  const results = names.map(name => {
    const entries = values.get(name) ?? [];
    return {
      name,
      average: entries.length
        ? Number((entries.reduce((sum, value) => sum + value, 0) / entries.length).toFixed(1))
        : 0,
      responses: entries.length,
    };
  });

  return order
    ? results
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
  const styleBreakdown = new Map(styleAnswerOrder.map(answer => [answer, new Map<string, number>()]));
  const musicMix = new Map<string, number[]>([
    ["Salsa", []],
    ["Bachata", []],
    ["Kizomba", []],
  ]);
  const musicPolicies = new Map<string, number>();
  const congresses: number[] = [];
  const lessonPrices = new Map<string, number[]>();
  const monthlySpending = new Map<string, number[]>();
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
    const lessonPrice = numberValue(learning.lessonPrice);
    const lessonCurrency = textValue(learning.lessonCurrency);
    if (lessonPrice !== null && lessonPrice >= 0 && lessonCurrency) {
      lessonPrices.set(lessonCurrency, [...(lessonPrices.get(lessonCurrency) ?? []), lessonPrice]);
    }
    const monthlySpend = numberValue(learning.monthlyDanceSpend);
    const monthlyCurrency = textValue(learning.monthlyDanceSpendCurrency);
    if (monthlySpend !== null && monthlySpend >= 0 && monthlyCurrency) {
      monthlySpending.set(monthlyCurrency, [...(monthlySpending.get(monthlyCurrency) ?? []), monthlySpend]);
    }

    const submittedStyles = objectValue(item.styles);
    const expandedStyles = new Map<string, string>();
    for (const [name, rating] of Object.entries(submittedStyles)) {
      if (!danceSubstyles[name]) expandedStyles.set(name, textValue(rating));
    }
    for (const [category, substyles] of Object.entries(danceSubstyles)) {
      const categoryAnswer = textValue(submittedStyles[category]);
      if (!categoryAnswer) continue;
      for (const substyle of substyles) {
        const name = `${category}: ${substyle}`;
        if (!expandedStyles.has(name)) expandedStyles.set(name, categoryAnswer);
      }
    }

    for (const [name, answer] of expandedStyles) {
      const score = styleScores[answer];
      if (score) {
        danceStyles.set(name, [...(danceStyles.get(name) ?? []), score]);
      }
      const answerCounts = styleBreakdown.get(answer);
      if (answerCounts) increment(answerCounts, name);
    }

    const music = objectValue(objectValue(item.favourites).musicMix);
    const mixFields = [["Salsa", music.salsa], ["Bachata", music.bachata], ["Kizomba", music.kizomba]] as const;
    const submittedPolicy = textValue(music.policy);
    if (/^[1-4]:[1-4]:[1-4]$/.test(submittedPolicy)) increment(musicPolicies, submittedPolicy);
    for (const [label, rawValue] of mixFields) {
      const value = numberValue(rawValue);
      if (value !== null) musicMix.get(label)!.push(value);
    }
  }

  return {
    totalResponses: items.length,
    latestSubmission,
    currentCountries: topCounts(currentCountries, 250),
    homeCountries: topCounts(homeCountries, 250),
    learningSources: topCounts(learningSources),
    weeklyActivities: averages(weeklyActivities, ["Teacher-led learning", "Active practice", "Social dancing"]),
    danceStyles: averages(danceStyles, danceStyleOrder),
    styleBreakdown: styleAnswerOrder.map(answer => ({
      answer,
      styles: topCounts(styleBreakdown.get(answer)!, 100),
    })),
    musicMix: averages(musicMix, ["Salsa", "Bachata", "Kizomba"]),
    musicPolicies: topCounts(musicPolicies, 64),
    spendingByCurrency: [...new Set([...lessonPrices.keys(), ...monthlySpending.keys()])]
      .sort()
      .map(currency => {
        const lessons = lessonPrices.get(currency) ?? [];
        const monthly = monthlySpending.get(currency) ?? [];
        return {
          currency,
          lessonPrice: lessons.length
            ? Number((lessons.reduce((sum, value) => sum + value, 0) / lessons.length).toFixed(2))
            : null,
          lessonResponses: lessons.length,
          monthlySpend: monthly.length
            ? Number((monthly.reduce((sum, value) => sum + value, 0) / monthly.length).toFixed(2))
            : null,
          monthlyResponses: monthly.length,
        };
      }),
    averageCongresses: congresses.length
      ? Number((congresses.reduce((sum, value) => sum + value, 0) / congresses.length).toFixed(1))
      : null,
  };
}
