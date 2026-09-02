import { Dashboard } from '@/features/dashboard/Dashboard';
import { greetingFor, longDateIn } from '@/lib/dates';
import { requireUser } from '@/server/auth';

export default async function DashboardPage() {
  // Rendered from the stored timezone so the greeting is correct on first paint.
  const user = await requireUser();

  return <Dashboard greeting={greetingFor(user.timezone)} dateLabel={longDateIn(user.timezone)} />;
}
