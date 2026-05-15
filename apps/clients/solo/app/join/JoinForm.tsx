'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type JoinQuestion = {
  id: string;
  prompt: string;
};

type JoinResult =
  | { status: 'idle' }
  | { status: 'success'; whatsappJoinCode?: string; whatsappJoinUrl?: string }
  | { status: 'pending' };

type JoinResponse = {
  status?: string;
  whatsappJoinUrl?: string;
  whatsapp_join_url?: string;
  whatsappJoinCode?: string;
  whatsapp_join_code?: string;
  joinCode?: string;
  whatsappCode?: string;
  message?: string;
};

type JoinFormProps = {
  orgSlug: string;
  questionBank: JoinQuestion[];
  initialQuestions: JoinQuestion[];
};


function selectRandomQuestions(bank: JoinQuestion[], count: number): JoinQuestion[] {
  const shuffled = [...bank];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

function selectJoinQuestions(bank: JoinQuestion[]): JoinQuestion[] {
  if (bank.length < 2) {
    return bank;
  }

  const teacherQuestion = bank.find((question) => question.id === 'local-teacher');
  if (!teacherQuestion) {
    return selectRandomQuestions(bank, 2);
  }

  const nonTeacherQuestions = bank.filter((question) => question.id !== 'local-teacher');
  if (!nonTeacherQuestions.length) {
    return [teacherQuestion];
  }

  const [randomSecondQuestion] = selectRandomQuestions(nonTeacherQuestions, 1);
  return [teacherQuestion, randomSecondQuestion];
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: (errorCode?: string) => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact';
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export default function JoinForm({ orgSlug, questionBank, initialQuestions }: JoinFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [questions, setQuestions] = useState<JoinQuestion[]>(() => {
    if (questionBank.length) {
      return selectJoinQuestions(questionBank);
    }
    return initialQuestions;
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [captchaToken, setCaptchaToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<JoinResult>({ status: 'idle' });

  const widgetContainerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  const clearTurnstileWidget = () => {
    if (!window.turnstile || !widgetIdRef.current) {
      return;
    }

    try {
      window.turnstile.remove(widgetIdRef.current);
    } catch {
      // Ignore stale widget errors during navigation/unmount races.
    } finally {
      widgetIdRef.current = null;
    }
  };

  const resetTurnstileWidget = () => {
    if (!window.turnstile || !widgetIdRef.current) {
      return;
    }

    try {
      window.turnstile.reset(widgetIdRef.current);
    } catch {
      // If the widget no longer exists (e.g. back nav), clear stale ID.
      widgetIdRef.current = null;
    }
  };

  const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;
  const turnstileTheme = useMemo<'light' | 'dark' | 'auto'>(() => {
    const value = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_THEME;
    if (value === 'light' || value === 'dark' || value === 'auto') {
      return value;
    }
    return 'dark';
  }, []);
  const turnstileSize = useMemo<'normal' | 'compact'>(() => {
    return process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SIZE === 'compact' ? 'compact' : 'normal';
  }, []);
  const joinApiUrl = useMemo(() => '/api/join', []);
  const organisationName = useMemo(() => {
    const normalized = orgSlug.replace(/[-_]+/g, ' ').trim();
    if (!normalized) {
      return 'this organisation';
    }

    return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
  }, [orgSlug]);

  useEffect(() => {
    const initialAnswers: Record<string, string> = {};
    questions.forEach((question) => {
      initialAnswers[question.id] = '';
    });
    setAnswers(initialAnswers);
  }, [questions]);

  useEffect(() => {
    if (!siteKey) {
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-turnstile="true"]');

    if (existingScript) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = 'true';
    document.head.appendChild(script);
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey || !widgetContainerRef.current) {
      return;
    }

    const renderTurnstile = () => {
      if (!window.turnstile || !widgetContainerRef.current || widgetIdRef.current) {
        return;
      }

      widgetIdRef.current = window.turnstile.render(widgetContainerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          setCaptchaToken(token);
          setErrorMessage('');
        },
        'expired-callback': () => {
          setCaptchaToken('');
        },
        'error-callback': (errorCode?: string) => {
          setCaptchaToken('');
          if (errorCode?.startsWith('110200')) {
            setErrorMessage(
              'Captcha domain is not authorized for this site key. Add localhost in Turnstile Hostname Management or switch NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY to a local-compatible key.',
            );
            return;
          }
          setErrorMessage('Captcha check failed. Please try again.');
        },
        theme: turnstileTheme,
        size: turnstileSize,
      });
    };

    renderTurnstile();

    const intervalId = window.setInterval(() => {
      renderTurnstile();
    }, 250);

    return () => {
      window.clearInterval(intervalId);
      clearTurnstileWidget();
    };
  }, [siteKey, turnstileSize, turnstileTheme]);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhoneNumber('');
    if (questionBank.length) {
      setQuestions(selectJoinQuestions(questionBank));
    }
    setCaptchaToken('');
    setErrorMessage('');
    setResult({ status: 'idle' });

    resetTurnstileWidget();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage('');

    if (!siteKey) {
      setErrorMessage('Captcha is not configured. Set NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY.');
      return;
    }

    if (!captchaToken) {
      setErrorMessage('Please complete the captcha check before submitting.');
      return;
    }

    if (!joinApiUrl) {
      setErrorMessage('Join API is not configured. Set NEXT_PUBLIC_DANCE_ENGINE_API or NEXT_PUBLIC_JOIN_API_ENDPOINT.');
      return;
    }

    const normalizedAnswers = questions.map((question) => ({
      questionId: question.id,
      question: question.prompt,
      answer: answers[question.id]?.trim() || '',
    }));

    const missingAnswer = normalizedAnswers.some((item) => !item.answer);
    if (missingAnswer) {
      setErrorMessage('Please answer both entry questions.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(joinApiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgSlug,
          name: fullName.trim(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
          captchaToken,
          answers: normalizedAnswers,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as JoinResponse;

      if (!response.ok) {
        setErrorMessage(body.message || 'We could not submit your join request. Please try again.');
        return;
      }

      const status = (body.status || '').toLowerCase();

      if (status === 'success') {
        const joinUrl = (body.whatsappJoinUrl || body.whatsapp_join_url || '').trim();
        const code = body.whatsappJoinCode || body.whatsapp_join_code || body.joinCode || body.whatsappCode || '';

        if (!joinUrl && !code) {
          setErrorMessage('You were approved, but no WhatsApp join details were returned by the API.');
          return;
        }

        setResult({ status: 'success', whatsappJoinCode: code || undefined, whatsappJoinUrl: joinUrl || undefined });
        return;
      }

      if (status === 'pending') {
        setResult({ status: 'pending' });
        return;
      }

      setErrorMessage('Unexpected response from join API.');
    } catch {
      setErrorMessage('Network error while submitting join request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-grow bg-[var(--main-bg-color,#0b1020)] text-[var(--main-text-color,#f5f7ff)]">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-2xl border border-white/20 bg-black/20 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
          <h1 className="text-3xl font-semibold tracking-tight">Join The Community</h1>
          <p className="mt-2 text-sm text-white/80">
            Complete this short application for <strong>{organisationName}</strong>. If your answers match and you&apos;re not a bot or scammer, you will get instant access.
            Otherwise your request will be marked pending and an admin will review it, we may message you for more information.
          </p>

          {result.status === 'success' ? (
            <section className="mt-6 rounded-xl border border-emerald-300/30 bg-emerald-900/20 p-5">
              <h2 className="text-xl font-semibold text-emerald-200">Success</h2>
              {result.whatsappJoinUrl ? (
                <div className="mt-3">
                  <p className="text-sm text-emerald-100/90">You are in. Join WhatsApp using this link:</p>
                  <a
                    href={result.whatsappJoinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex break-all rounded-lg bg-black/40 px-4 py-3 text-sm text-emerald-100 underline"
                  >
                    {result.whatsappJoinUrl}
                  </a>
                </div>
              ) : null}
              {result.whatsappJoinCode ? (
                <div className="mt-3">
                  <p className="text-sm text-emerald-100/90">Use this WhatsApp join code:</p>
                  <p className="mt-2 rounded-lg bg-black/40 px-4 py-3 font-mono text-lg tracking-wide text-emerald-100">
                    {result.whatsappJoinCode}
                  </p>
                </div>
              ) : null}
              <button
                type="button"
                onClick={resetForm}
                className="mt-4 inline-flex rounded-lg border border-emerald-200/40 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-700/20"
              >
                Submit Another
              </button>
            </section>
          ) : null}

          {result.status === 'pending' ? (
            <section className="mt-6 rounded-xl border border-amber-300/30 bg-amber-800/20 p-5">
              <h2 className="text-xl font-semibold text-amber-200">Pending Review</h2>
              <p className="mt-2 text-sm text-amber-100/90">
                Thanks for applying. Your request is pending admin approval. We will email you once it is approved.
              </p>
              <button
                type="button"
                onClick={resetForm}
                className="mt-4 inline-flex rounded-lg border border-amber-200/40 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-700/20"
              >
                Submit Another
              </button>
            </section>
          ) : null}

          {result.status === 'idle' ? (
            <form className="mt-6 space-y-5" onSubmit={handleSubmit} autoComplete="on" noValidate={false}>

              <div className="space-y-2">
                <label htmlFor="join-name" className="text-sm font-medium text-white/90">
                  Name <span aria-hidden="true">*</span>
                </label>
                <input
                  id="join-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  enterKeyHint="next"
                  aria-required="true"
                  aria-describedby="join-form-help"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full rounded-lg border border-white/25 bg-black/25 px-3 py-2.5 text-base outline-none transition focus:border-cerise-logo"
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="join-email" className="text-sm font-medium text-white/90">
                  Email
                </label>
                <input
                  id="join-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  enterKeyHint="next"
                  aria-required="true"
                  aria-describedby="join-form-help"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-white/25 bg-black/25 px-3 py-2.5 text-base outline-none transition focus:border-cerise-logo"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="join-phone" className="text-sm font-medium text-white/90">
                  Phone Number
                </label>
                <input
                  id="join-phone"
                  name="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  enterKeyHint="next"
                  aria-required="true"
                  aria-describedby="join-form-help"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  className="w-full rounded-lg border border-white/25 bg-black/25 px-3 py-2.5 text-base outline-none transition focus:border-cerise-logo"
                  placeholder="+44 7000 000000"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div className="space-y-4">
                  {questions.map((question) => (
                    <div key={question.id} className="space-y-2">
                      <label htmlFor={`q-${question.id}`} className="block text-sm font-medium text-white/90">
                        {question.prompt}
                      </label>
                      <input
                        id={`q-${question.id}`}
                        type="text"
                        required
                        autoComplete="off"
                        enterKeyHint="next"
                        aria-required="true"
                        aria-describedby="join-form-help"
                        value={answers[question.id] || ''}
                        onChange={(event) => {
                          setAnswers((previous) => ({
                            ...previous,
                            [question.id]: event.target.value,
                          }));
                        }}
                        className="w-full rounded-lg border border-white/25 bg-black/25 px-3 py-2.5 text-base outline-none transition focus:border-cerise-logo"
                      />
                    </div>
                  ))}
                </div>

                <div className="md:pb-1">
                  <button
                    type="button"
                    onClick={() => setQuestions(selectJoinQuestions(questionBank))}
                    className="inline-flex w-full justify-center rounded-lg border border-white/35 px-3 py-2 text-sm font-medium text-white hover:bg-white/10 md:w-auto"
                  >
                    Change question
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p id="join-captcha-label" className="text-sm font-medium text-white/90">Just checking your a real person</p>
                <div
                  ref={widgetContainerRef}
                  className="min-h-16"
                  role="group"
                  aria-labelledby="join-captcha-label"
                />
                {!siteKey ? (
                  <p className="text-xs text-amber-200/90">
                    Turnstile is not configured. Set NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY.
                  </p>
                ) : null}
              </div>

              {errorMessage ? (
                <p role="alert" aria-live="assertive" className="text-sm text-rose-300">
                  {errorMessage}
                </p>
              ) : (
                <p className="sr-only" aria-live="polite">
                  No form errors.
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                enterKeyHint='done'
                className="inline-flex w-full items-center justify-center rounded-lg bg-cerise-logo px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cerise-on-light disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Join Request'}
              </button>
              <p>By submitting this form you consent to the   <Link href="/tos" className="underline">terms and conditions</Link>, <Link href="/privacy" className="underline">privacy policy</Link> and to Dance Engine and {organisationName} sending you relevant SBK information.</p>
            </form>
          ) : null}
        </div>
      </div>
    </main>
  );
}
