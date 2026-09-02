import { TaskView } from '@/features/tasks/TaskView';

export default function TodayPage() {
  return <TaskView view="today" title="Today" subtitle="Everything due now, overdue work included." />;
}
