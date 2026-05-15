import { headers } from 'next/headers';

import JoinForm from '@/app/join/JoinForm';
import { getPublicJoinQuestions } from '@/app/join/question-bank';
import Header from '@/components/header/Header';
import DanceEngineFooter from '@/components/footer/DanceEngine';
import { OrganisationType } from '@dance-engine/schemas/organisation';

function selectRandomQuestions<T>(bank: T[], count: number): T[] {
  const shuffled = [...bank];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

function selectJoinQuestions<T extends { id: string }>(bank: T[]): T[] {
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

export default async function JoinPage() {
  const h = await headers();
  const orgSlug = h.get('x-site-org') || 'default-org';
  // Fetch org data (mirroring main page)
  const ORGS_API_URL = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/organisations`;
  const orgs_res = await fetch(ORGS_API_URL, { next: { revalidate: 120 } });
  const orgs_data = await orgs_res.json();
  const org_details = orgs_data.organisations.filter((org_check: OrganisationType) => org_check.organisation && org_check.organisation == orgSlug);
  const org = org_details[0] || { name: 'Unknown Organisation', slug: 'unknown-org', description: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"No organisation found for this domain"}]}]}' };

  const questionBank = getPublicJoinQuestions(orgSlug);
  const initialQuestions = selectJoinQuestions(questionBank);

  return (
    <div className="flex min-h-screen h-full flex-col justify-between">
      <Header org={org} />
      <JoinForm orgSlug={orgSlug} questionBank={questionBank} initialQuestions={initialQuestions} />
      <DanceEngineFooter org={orgSlug} mode="dark" />
    </div>
  );
}
