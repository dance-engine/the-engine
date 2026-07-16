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
};

type OrganisationSettingsResponse = {
  organisation?: OrganisationRecord;
};

type CustomerRecord = {
  email?: string;
  bio?: string;
  version?: number;
};

type CustomerListResponse = {
  customers?: Array<CustomerRecord | null>;
};

// Tiptap content block structure
type TiptapParagraph = {
  type: 'paragraph';
  attrs?: Record<string, unknown>;
  content?: Array<{ type: 'text'; text: string }>;
};

type TiptapTableNode = {
  type: 'table';
  content?: Array<Record<string, unknown>>;
};

type TiptapDoc = {
  type: 'doc';
  content: Array<TiptapParagraph | TiptapTableNode | Record<string, unknown>>;
};

const WHATSAPP_METADATA_TABLE_HEADER = 'WhatsApp Metadata';

const getFirstTextFromNode = (node: unknown): string => {
  if (!node || typeof node !== 'object') {
    return '';
  }

  const maybeText = (node as { text?: unknown }).text;
  if (typeof maybeText === 'string') {
    return maybeText.trim();
  }

  const content = (node as { content?: unknown }).content;
  if (!Array.isArray(content)) {
    return '';
  }

  for (const child of content) {
    const text = getFirstTextFromNode(child);
    if (text) {
      return text;
    }
  }

  return '';
};

const isWhatsappMetadataTable = (node: unknown): boolean => {
  if (!node || typeof node !== 'object') {
    return false;
  }

  const tableNode = node as { type?: unknown; content?: unknown };
  if (tableNode.type !== 'table' || !Array.isArray(tableNode.content) || tableNode.content.length === 0) {
    return false;
  }

  const firstRow = tableNode.content[0] as { content?: unknown };
  if (!firstRow || !Array.isArray(firstRow.content) || firstRow.content.length === 0) {
    return false;
  }

  const firstCell = firstRow.content[0];
  return getFirstTextFromNode(firstCell) === WHATSAPP_METADATA_TABLE_HEADER;
};

const getDanceEngineApiBase = (): string => (process.env.NEXT_PUBLIC_DANCE_ENGINE_API || '').trim();

const getDanceEngineBearerToken = (): string =>
  (process.env.DANCE_ENGINE_API_BEARER_TOKEN || '').trim();

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

  return (record.whatsapp_join_url || '').trim();
};

const parseBioAsJson = (bio: string | undefined): TiptapDoc => {
  if (!bio) {
    return { type: 'doc', content: [] };
  }

  const trimmedBio = bio.trim();
  if (!trimmedBio) {
    return { type: 'doc', content: [] };
  }

  try {
    const parsed = JSON.parse(bio);
    if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
      return parsed as TiptapDoc;
    }
  } catch {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: trimmedBio,
            },
          ],
        },
      ],
    };
  }

  return { type: 'doc', content: [] };
};

const bioToJsonString = (doc: TiptapDoc): string => JSON.stringify(doc);

const buildWhatsappMetadataTable = (status: 'pending' | 'invited'): TiptapTableNode => ({
  type: 'table',
  content: [
    {
      type: 'tableRow',
      content: [
        {
          type: 'tableHeader',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: WHATSAPP_METADATA_TABLE_HEADER }],
            },
          ],
        },
        {
          type: 'tableHeader',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Value' }],
            },
          ],
        },
      ],
    },
    {
      type: 'tableRow',
      content: [
        {
          type: 'tableCell',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Group Status' }],
            },
          ],
        },
        {
          type: 'tableCell',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: status }],
            },
          ],
        },
      ],
    },
    {
      type: 'tableRow',
      content: [
        {
          type: 'tableCell',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Updated At' }],
            },
          ],
        },
        {
          type: 'tableCell',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: new Date().toISOString() }],
            },
          ],
        },
      ],
    },
  ],
});

const buildJoinApplicationParagraph = (score: number, answers: Array<{ questionId: string; answer: string }>): TiptapParagraph => {
  const lines = [
    `Join Application Score: ${score.toFixed(2)}`,
    ...answers.map((item) => `${item.questionId}: ${item.answer}`),
  ];
  return {
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text: lines.join('\n'),
      },
    ],
  };
};

const upsertBioWithWhatsappAndJoinApplication = (
  existingBio: string | undefined,
  whatsappTable: TiptapTableNode,
  joinApplicationParagraph: TiptapParagraph,
): string => {
  const doc = parseBioAsJson(existingBio);

  // Remove existing WhatsApp metadata table if present.
  doc.content = doc.content.filter((node) => !isWhatsappMetadataTable(node));

  // Add updated WhatsApp metadata table.
  doc.content.push(whatsappTable);

  // Add join application paragraph
  doc.content.push(joinApplicationParagraph);

  return bioToJsonString(doc);
};

async function fetchExistingCustomer(input: {
  orgSlug: string;
  email: string;
  bearerToken?: string;
}): Promise<{ bio: string; version: number }> {
  const apiBase = getDanceEngineApiBase();
  if (!apiBase) {
    return { bio: '', version: 0 };
  }

  const bearerToken = (input.bearerToken || getDanceEngineBearerToken()).trim();
  if (!bearerToken) {
    return { bio: '', version: 0 };
  }

  const response = await fetch(`${apiBase}/${input.orgSlug}/customers/${encodeURIComponent(input.email)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return { bio: '', version: 0 };
  }

  const data = (await response.json().catch(() => ({}))) as CustomerListResponse;
  const customers = Array.isArray(data.customers) ? data.customers : [];
  const matchingCustomer = customers.find((customer) => {
    if (!customer || !customer.email) {
      return false;
    }
    return customer.email.toLowerCase() === input.email.toLowerCase();
  }) || customers.find((customer) => Boolean(customer));

  return {
    bio: (matchingCustomer?.bio || '').trim(),
    version: (matchingCustomer?.version || 0) as number,
  };
}

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

  const existing = await fetchExistingCustomer({
    orgSlug: input.orgSlug,
    email: input.email,
    bearerToken,
  });

  const whatsappTable = buildWhatsappMetadataTable(input.whatsappGroupStatus);
  const joinApplicationParagraph = buildJoinApplicationParagraph(input.score, input.answers);
  const mergedBio = upsertBioWithWhatsappAndJoinApplication(existing.bio, whatsappTable, joinApplicationParagraph);

  const requestBody = {
    customer: {
      name: input.name,
      email: input.email,
      phone: input.phoneNumber,
      whatsapp_group_status: input.whatsappGroupStatus,
      bio: mergedBio,
      version: existing.version,
    },
  };

  const isNewCustomer = existing.version === 0 && !existing.bio;
  const method = isNewCustomer ? 'POST' : 'PUT';
  const url = isNewCustomer
    ? `${apiBase}/${input.orgSlug}/customers`
    : `${apiBase}/${input.orgSlug}/customers/${encodeURIComponent(input.email)}`;

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (response.ok) {
    console.log(`Customer record ${isNewCustomer ? 'created' : 'updated'} for ${input.email} in org ${input.orgSlug}`);
    return;
  }

  const errorText = await response.text();
  console.log(`Failed to ${isNewCustomer ? 'create' : 'update'} customer record`, { status: response.status, response: errorText });
  throw new Error(`Customer ${isNewCustomer ? 'creation' : 'update'} failed (${response.status}): ${errorText}`);
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

async function handleJoinRequest(req: Request) {
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

    const expectedAnswerCount = publicQuestions.length < 2 ? publicQuestions.length : 2;
    if (normalizedAnswers.length !== expectedAnswerCount) {
      return NextResponse.json(
        {
          message:
            expectedAnswerCount === 1
              ? 'Please answer exactly one valid question.'
              : `Please answer exactly ${expectedAnswerCount} valid questions.`,
        },
        { status: 400 },
      );
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
        whatsapp_join_url: whatsappJoinUrl,
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

export async function PUT(req: Request) {
  return handleJoinRequest(req);
}

export async function POST(req: Request) {
  return handleJoinRequest(req);
}
