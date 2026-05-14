import { NextResponse } from 'next/server';
import { evaluateJoinAnswers, getPublicJoinQuestions } from '@/app/join/question-bank';

type JoinRequestBody = {
  orgSlug?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  captchaToken?: string;
  answers?: Array<{
    questionId?: string;
    answer?: string;
  }>;
};

type OrganisationRecord = {
  organisation?: string;
  whatsapp_join_url?: string;
  whatsappJoinUrl?: string;
  settings?: {
    whatsapp_join_url?: string;
    whatsappJoinUrl?: string;
  };
  meta?: {
    whatsapp_join_url?: string;
    whatsappJoinUrl?: string;
  };
};

type OrganisationSettingsResponse = {
  organisation?: OrganisationRecord;
};

const getDanceEngineApiBase = (): string => (process.env.NEXT_PUBLIC_DANCE_ENGINE_API || '').trim();

const getDanceEngineBearerToken = (): string =>
  (process.env.DANCE_ENGINE_API_BEARER_TOKEN || process.env.DANCE_ENGINE_BEARER_TOKEN || '').trim();

const getBearerTokenFromAuthorizationHeader = (headerValue: string | null): string => {
  if (!headerValue) {
    return '';
  }

  const [scheme, token] = headerValue.trim().split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return '';
  }

  return token.trim();
};

const extractWhatsappJoinUrl = (record?: OrganisationRecord | null): string => {
  if (!record) {
    return '';
  }

  return (
    record.whatsapp_join_url
    || record.whatsappJoinUrl
    || record.settings?.whatsapp_join_url
    || record.settings?.whatsappJoinUrl
    || record.meta?.whatsapp_join_url
    || record.meta?.whatsappJoinUrl
    || ''
  ).trim();
};

async function fetchOrganisationWhatsappJoinUrl(orgSlug: string, bearerToken?: string): Promise<string> {
  const apiBase = getDanceEngineApiBase();
  if (!apiBase) {
    throw new Error('Dance Engine API base URL is missing. Set NEXT_PUBLIC_DANCE_ENGINE_API.');
  }

  const resolvedBearerToken = (bearerToken || getDanceEngineBearerToken()).trim();
  if (!resolvedBearerToken) {
    throw new Error('Missing Dance Engine API bearer token. Provide Authorization header or set DANCE_ENGINE_API_BEARER_TOKEN.');
  }

  const settingsResponse = await fetch(`${apiBase}/${orgSlug}/settings`, {
    next: { revalidate: 0 },
    headers: {
      Authorization: `Bearer ${resolvedBearerToken}`,
    },
  });

  if (!settingsResponse.ok) {
    return '';
  }

  const settingsData = (await settingsResponse.json()) as OrganisationSettingsResponse;
  return extractWhatsappJoinUrl(settingsData.organisation);
}

async function createCustomerRecord(input: {
  orgSlug: string;
  name: string;
  email: string;
  phoneNumber: string;
  whatsappGroupStatus: 'pending' | 'invited';
  score: number;
  answers: Array<{ questionId: string; answer: string }>;
  bearerToken?: string;
}): Promise<void> {
  const apiBase = getDanceEngineApiBase();
  if (!apiBase) {
    throw new Error('Dance Engine API base URL is missing. Set NEXT_PUBLIC_DANCE_ENGINE_API.');
  }

  const bearerToken = (input.bearerToken || getDanceEngineBearerToken()).trim();
  if (!bearerToken) {
    throw new Error('Missing Dance Engine API bearer token. Provide Authorization header or set DANCE_ENGINE_API_BEARER_TOKEN.');
  }

  const requestBody = {
    customer: {
      name: input.name,
      email: input.email,
      phone: input.phoneNumber,
      whatsapp_group_status: input.whatsappGroupStatus,
      bio: [
        `Join application score: ${input.score.toFixed(2)}`,
        ...input.answers.map((item) => `${item.questionId}: ${item.answer}`),
      ].join('\n'),
      version: 0,
    },
  };

  const response = await fetch(`${apiBase}/${input.orgSlug}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (response.ok) {
    console.log(`Customer record created for ${input.email} in org ${input.orgSlug}`);
    return;
  }

  const errorText = await response.text();
  throw new Error(`Customer creation failed (${response.status}): ${errorText}`);
}

async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  if (!secret) {
    return false;
  }

  const payload = new URLSearchParams();
  payload.set('secret', secret);
  payload.set('response', token);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  });

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as { success?: boolean };
  return Boolean(data.success);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as JoinRequestBody;
    const inboundBearerToken = getBearerTokenFromAuthorizationHeader(req.headers.get('authorization'));
    const bearerToken = (inboundBearerToken || getDanceEngineBearerToken()).trim();

    const orgSlug = (body.orgSlug || 'default-org').trim();
    const name = (body.name || '').trim();
    const email = (body.email || '').trim();
    const phoneNumber = (body.phoneNumber || '').trim();
    const captchaToken = (body.captchaToken || '').trim();
    const answers = Array.isArray(body.answers) ? body.answers : [];

    if (!name || !email || !phoneNumber) {
      return NextResponse.json({ message: 'Name, email, and phone number are required.' }, { status: 400 });
    }

    if (!captchaToken) {
      return NextResponse.json({ message: 'Captcha token is required.' }, { status: 400 });
    }

    const captchaOk = await verifyTurnstileToken(captchaToken);
    if (!captchaOk) {
      return NextResponse.json({ message: 'Captcha verification failed.' }, { status: 400 });
    }

    const publicQuestions = getPublicJoinQuestions(orgSlug);
    const allowedQuestionIds = new Set(publicQuestions.map((question) => question.id));

    const normalizedAnswers = answers
      .map((item) => ({
        questionId: (item.questionId || '').trim(),
        answer: (item.answer || '').trim(),
      }))
      .filter((item) => item.questionId && item.answer && allowedQuestionIds.has(item.questionId));

    if (normalizedAnswers.length !== 2) {
      return NextResponse.json({ message: 'Please answer exactly two valid questions.' }, { status: 400 });
    }

    const evaluation = evaluateJoinAnswers(orgSlug, normalizedAnswers);

    await createCustomerRecord({
      orgSlug,
      name,
      email,
      phoneNumber,
      whatsappGroupStatus: evaluation.passed ? 'invited' : 'pending',
      score: evaluation.score,
      answers: normalizedAnswers,
      bearerToken,
    });

    if (evaluation.passed) {
      const whatsappJoinUrl = await fetchOrganisationWhatsappJoinUrl(orgSlug, bearerToken);

      if (!whatsappJoinUrl) {
        return NextResponse.json(
          { message: 'No WhatsApp join URL is configured for this organisation.' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        status: 'success',
        whatsappJoinUrl,
      });
    }

    return NextResponse.json({
      status: 'pending',
      message: 'Application pending review.',
    });
  } catch (error) {
    console.error('Join API error', error);
    return NextResponse.json({ message: 'Unable to process join request.' }, { status: 500 });
  }
}
