import { headers } from 'next/headers';
import JoinForm from '@/app/join/JoinForm';
import { getPublicJoinQuestions } from '@/app/join/question-bank';

function selectRandomQuestions<T>(bank: T[], count: number): T[] {
  const shuffled = [...bank];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

export default async function JoinPage() {
  const h = await headers();
  const orgSlug = h.get('x-site-org') || 'default-org';
  const questionBank = getPublicJoinQuestions(orgSlug);
  const initialQuestions = questionBank.length >= 2 ? selectRandomQuestions(questionBank, 2) : questionBank;

  return <JoinForm orgSlug={orgSlug} questionBank={questionBank} initialQuestions={initialQuestions} />;
}
