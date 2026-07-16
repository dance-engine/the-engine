export type PublicJoinQuestion = {
  id: string;
  prompt: string;
};

type JoinQuestionWithAnswers = PublicJoinQuestion & {
  acceptedAnswers: string[];
};

type OrgJoinConfig = {
  passThreshold: number;
  localTeacherAliases: string[];
  titleHtml?: string;
  introHtml?: string;
  successHtml?: string;
  pendingHtml?: string;
  failureMessage?: string;
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
    acceptedAnswers: ['salsa', 'bachata', 'kizomba', 'semba', 'zouk', 'cha cha', 'cuban', 'on1', 'on2','rueda', 'afro'],
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
    id: 'events',
    prompt: 'What kind of events are you most interested in: socials, workshops, or teams?',
    acceptedAnswers: ['social', 'socials', 'workshop', 'workshops', 'team', 'teams'],
  },
  
];

const DEFAULT_JOIN_INTRO_HTML =
  'Complete this short application for <strong>{{organisationName}}</strong>. If your answers match and you are not a bot or scammer, you will get immediately queued for admin approval. Otherwise your request will be marked pending and an admin will review it before sending the WhatsApp link and we may message you for more information.';
const DEFAULT_JOIN_TITLE_HTML = 'Join <span class="whitespace-nowrap">{{organisationName}}</span>';
const DEFAULT_JOIN_SUCCESS_HTML =
  '<h2 class="text-xl font-semibold text-emerald-200">Success</h2><p class="mt-2 text-sm text-emerald-100/90">You are in. Join the <strong>{{organisationName}}</strong> WhatsApp community using the details below.</p>';
const DEFAULT_JOIN_PENDING_HTML =
  '<h2 class="text-xl font-semibold text-amber-200">Pending Review</h2><p class="mt-2 text-sm text-amber-100/90">Thanks for applying to <strong>{{organisationName}}</strong>. Your request is pending admin approval and we will email you once it is approved.</p>';
const DEFAULT_JOIN_FAILURE_MESSAGE = 'We could not submit your join request. Please try again.';

const ORG_CONFIGS: Record<string, OrgJoinConfig> = {
  default: {
    passThreshold: 0.45,
    localTeacherAliases: ['adam','alex','angel','connor','joey','jp','libby','nicola',"steve","ant","tee", "ellena","jonathon","johnny" ],
    titleHtml: DEFAULT_JOIN_TITLE_HTML,
    introHtml: DEFAULT_JOIN_INTRO_HTML,
    successHtml: DEFAULT_JOIN_SUCCESS_HTML,
    pendingHtml: DEFAULT_JOIN_PENDING_HTML,
    failureMessage: DEFAULT_JOIN_FAILURE_MESSAGE,
    questions: DEFAULT_QUESTIONS,
  },
  'latin-soul': {
    passThreshold: 0.45,
    localTeacherAliases: ['daniel', 'ana', 'mario', 'sofia'],
    titleHtml: DEFAULT_JOIN_TITLE_HTML,
    introHtml: DEFAULT_JOIN_INTRO_HTML,
    successHtml: DEFAULT_JOIN_SUCCESS_HTML,
    pendingHtml: DEFAULT_JOIN_PENDING_HTML,
    failureMessage: DEFAULT_JOIN_FAILURE_MESSAGE,
    questions: DEFAULT_QUESTIONS,
  },
  'rebel-sbk': {
    passThreshold: 0.45,
    localTeacherAliases: ['andreas', 'rebel'],
    titleHtml: '<span class="">Rebel Tribe</span> Waiting List',
    introHtml: 'Rebel Tribe is sweeping across the UK! If we don&apos;t have the dates confirmed for your city, fill out this form and as soon as we do we&apos;ll be in touch.',
    successHtml: '<h2 class="text-xl font-semibold text-emerald-200">You&apos;re in!</h2><p class="mt-2 text-sm text-emerald-100/90">As soon as we have the dates confirmed for your city, we&apos;ll be in touch. Follow up on social media for other updates and announcements.</p>',
    pendingHtml: '<h2 class="text-xl font-semibold text-amber-200">You&apos;re in!</h2><p class="mt-2 text-sm text-amber-100/90">As soon as we have the dates confirmed for your city, we&apos;ll be in touch.</p>',
    failureMessage: 'We could not process your request. Please try again.',
    questions: [{
      id: 'city-of-interest',
      prompt: 'What city would are you interested in?',
      acceptedAnswers: ['manchester','sheffield']
    }]
  },
  'power-of-woman': {
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

export function getJoinIntroHtml(orgSlug: string): string {
  return getOrgConfig(orgSlug).introHtml || DEFAULT_JOIN_INTRO_HTML;
}

export function getJoinTitleHtml(orgSlug: string): string {
  return getOrgConfig(orgSlug).titleHtml || DEFAULT_JOIN_TITLE_HTML;
}

export function getJoinSuccessHtml(orgSlug: string): string {
  return getOrgConfig(orgSlug).successHtml || DEFAULT_JOIN_SUCCESS_HTML;
}

export function getJoinPendingHtml(orgSlug: string): string {
  return getOrgConfig(orgSlug).pendingHtml || DEFAULT_JOIN_PENDING_HTML;
}

export function getJoinFailureMessage(orgSlug: string): string {
  return getOrgConfig(orgSlug).failureMessage || DEFAULT_JOIN_FAILURE_MESSAGE;
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
