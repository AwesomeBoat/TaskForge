export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'completed';
export type ThemePreference = 'light' | 'dark' | 'system';

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  xpAwarded: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type Stats = {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  streakCurrent: number;
  streakLongest: number;
  xpToday: number;
  completedToday: number;
  dueToday: number;
  today: string;
};

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  theme: ThemePreference;
  soundEnabled: boolean;
};

export type ApiErrorBody = {
  error: string;
  code?: string;
  fields?: Record<string, string>;
};
