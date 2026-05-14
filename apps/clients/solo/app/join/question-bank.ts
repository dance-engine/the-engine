export type PublicJoinQuestion = {
  id: string;
  prompt: string;
};

type JoinQuestionWithAnswers = PublicJoinQuestion & {
  acceptedAnswers: string[];
};

type OrgJoinConfig = {
  whatsappJoinCode: string;
  passThreshold: number;
  localTeacherAliases: string[];
  questions: JoinQuestionWithAnswers[];
};

type SubmittedAnswer = {
  questionId: string;
  answer: string;
};

const DEFAULT_QUESTIONS: JoinQuestionWithAnswers[] = [
  {
    id: 'dance-style',
    prompt: 'What styles do you dance?',
    acceptedAnswers: ['salsa', 'bachata', 'kizomba', 'semba', 'zouk', 'cha cha', 'cuban', 'on1', 'on2'],
  },
  {
    id: 'experience',
    prompt: 'How much experience do you have?',
    acceptedAnswers: ['month', 'months', 'year', 'years', 'week', 'weeks'],
  },
  {
    id: 'partnering',
    prompt: 'What do you enjoy most about partner dancing?',
    acceptedAnswers: ['connection', 'musicality', 'lead', 'follow', 'partner'],
  },
  {
    id: 'community-values',
    prompt: 'What makes a dance community feel safe and welcoming to you?',
    acceptedAnswers: ['respect', 'inclusive', 'safe', 'welcoming', 'kind'],
  },
  {
    id: 'learning-style',
    prompt: 'How do you learn best in class: visual, verbal, or repetition?',
    acceptedAnswers: ['visual', 'verbal', 'repetition', 'practice', 'demo', 'i do not know', 'dont know', 'not sure', 'unsure', 'idk'],
  },
  {
    id: 'local-teacher',
    prompt: 'Name a local teacher you know.',
    acceptedAnswers: ['teacher', 'instructor', 'coach', 'mentor'],
  },
  {
    id: 'events',
    prompt: 'What kind of events are you most interested in: socials, workshops, or teams?',
    acceptedAnswers: ['social', 'socials', 'workshop', 'workshops', 'team', 'teams'],
  },
];

const ORG_CONFIGS: Record<string, OrgJoinConfig> = {
  default: {
    whatsappJoinCode: 'ASK-ADMIN',
    passThreshold: 0.45,
    localTeacherAliases: ['adam','alex','angel','connor','joey','jp','libby','nicola'],
    questions: DEFAULT_QUESTIONS,
  },
  'latin-soul': {
    whatsappJoinCode: 'ASK-ADMIN',
    passThreshold: 0.45,
    localTeacherAliases: ['daniel', 'ana', 'mario', 'sofia'],
    questions: DEFAULT_QUESTIONS,
  },
  'rebel-sbk': {
    whatsappJoinCode: 'ASK-ADMIN',
    passThreshold: 0.45,
    localTeacherAliases: ['andreas', 'rebel'],
    questions: DEFAULT_QUESTIONS,
  },
  'power-of-woman': {
    whatsappJoinCode: 'ASK-ADMIN',
    passThreshold: 0.45,
    localTeacherAliases: ['pow team', 'pow teacher'],
    questions: DEFAULT_QUESTIONS,
  },
};

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value: string): string[] => {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(' ') : [];
};

const tokenOverlapScore = (left: string, right: string): number => {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let overlap = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  });

  const denominator = Math.max(leftTokens.size, rightTokens.size);
  return overlap / denominator;
};

const fuzzyScore = (answer: string, expected: string): number => {
  const normalizedAnswer = normalizeText(answer);
  const normalizedExpected = normalizeText(expected);

  if (!normalizedAnswer || !normalizedExpected) {
    return 0;
  }

  if (normalizedAnswer === normalizedExpected) {
    return 1;
  }

  if (normalizedAnswer.includes(normalizedExpected) || normalizedExpected.includes(normalizedAnswer)) {
    return 0.9;
  }

  return tokenOverlapScore(normalizedAnswer, normalizedExpected);
};

const isExperienceNumberAndUnit = (answer: string): boolean => {
  const normalized = normalizeText(answer);
  return /\b\d+(?:\.\d+)?\s+(year|years|month|months|week|weeks)\b/.test(normalized);
};

const getLocalTeacherAliases = (orgSlug: string, config: OrgJoinConfig): string[] => {
  const envKey = `JOIN_LOCAL_TEACHERS_${orgSlug.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  const envAliases = process.env[envKey]
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (envAliases && envAliases.length) {
    return envAliases;
  }

  return config.localTeacherAliases;
};

const scoreSubmittedAnswer = (orgSlug: string, config: OrgJoinConfig, question: JoinQuestionWithAnswers, answer: string): number => {
  const normalizedAnswer = normalizeText(answer);

  if (!normalizedAnswer) {
    return 0;
  }

  if (question.id === 'experience' && isExperienceNumberAndUnit(answer)) {
    return 1;
  }

  if (question.id === 'local-teacher') {
    const aliases = getLocalTeacherAliases(orgSlug, config);
    const aliasScore = aliases.reduce((best, alias) => Math.max(best, fuzzyScore(answer, alias)), 0);
    if (aliasScore >= 0.65) {
      return 1;
    }

    const hasPersonLikeAnswer = tokenize(answer).length >= 2;
    if (hasPersonLikeAnswer) {
      return 0.5;
    }
  }

  return question.acceptedAnswers.reduce((best, expected) => {
    const score = fuzzyScore(answer, expected);
    return Math.max(best, score);
  }, 0);
};

const getOrgConfig = (orgSlug: string): OrgJoinConfig => ORG_CONFIGS[orgSlug] || ORG_CONFIGS.default;

export function getPublicJoinQuestions(orgSlug: string): PublicJoinQuestion[] {
  return getOrgConfig(orgSlug).questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
  }));
}

export function evaluateJoinAnswers(orgSlug: string, answers: SubmittedAnswer[]): { passed: boolean; score: number } {
  const config = getOrgConfig(orgSlug);

  if (!answers.length) {
    return { passed: false, score: 0 };
  }

  const questionsById = new Map(config.questions.map((question) => [question.id, question]));

  const perAnswerScores = answers.map((submitted) => {
    const question = questionsById.get(submitted.questionId);
    if (!question) {
      return 0;
    }

    return scoreSubmittedAnswer(orgSlug, config, question, submitted.answer);
  });

  const score = perAnswerScores.reduce((sum, current) => sum + current, 0) / perAnswerScores.length;
  return {
    passed: score >= config.passThreshold,
    score,
  };
}

export function getWhatsappJoinCode(orgSlug: string): string {
  const envKey = `JOIN_WHATSAPP_CODE_${orgSlug.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  const envOverride = process.env[envKey];

  if (envOverride) {
    return envOverride;
  }

  return process.env.JOIN_WHATSAPP_CODE || getOrgConfig(orgSlug).whatsappJoinCode;
}
