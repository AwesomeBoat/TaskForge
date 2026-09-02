import { z } from 'zod';
import { isIsoDate, isValidTimezone } from './dates';

/** Emails are normalised here so the unique index and lookups always agree. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'That email is too long.')
  .pipe(z.email('Enter a valid email address.'));

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(128, 'That password is too long.');

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Tell us what to call you.')
  .max(60, 'Keep it under 60 characters.');

export const timezoneSchema = z
  .string()
  .max(64)
  .refine(isValidTimezone, 'Unknown timezone.')
  .catch('UTC');

const isoDateSchema = z.string().refine(isIsoDate, 'Use the YYYY-MM-DD format.');

export const tagNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Tags need a name.')
  .max(24, 'Tags are limited to 24 characters.')
  .regex(/^[a-z0-9][a-z0-9 _-]*$/, 'Tags can use letters, numbers, spaces, - and _.');

export const prioritySchema = z.enum(['low', 'medium', 'high']);
export const themeSchema = z.enum(['light', 'dark', 'system']);

export const signupSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
  timezone: timezoneSchema.optional(),
});

export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.').max(128),
  timezone: timezoneSchema.optional(),
});

export const forgotPasswordSchema = z.strictObject({ email: emailSchema });

export const resetPasswordSchema = z.strictObject({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

const tagsSchema = z.array(tagNameSchema).max(8, 'Up to 8 tags per task.');

export const createTaskSchema = z.strictObject({
  title: z.string().trim().min(1, 'Give the task a title.').max(200, 'Keep titles under 200 characters.'),
  description: z.string().trim().max(5000, 'That description is too long.').nullish(),
  priority: prioritySchema.default('medium'),
  dueDate: isoDateSchema.nullish(),
  tags: tagsSchema.optional(),
});

/** Only these fields can ever be written by a client — no status, no XP, no ids. */
export const updateTaskSchema = z
  .strictObject({
    title: z.string().trim().min(1, 'Give the task a title.').max(200),
    description: z.string().trim().max(5000).nullish(),
    priority: prioritySchema,
    dueDate: isoDateSchema.nullish(),
    tags: tagsSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update.');

export const completeTaskSchema = z.strictObject({
  completed: z.boolean(),
  timezone: timezoneSchema.optional(),
});

export const preferencesSchema = z
  .strictObject({
    theme: themeSchema,
    soundEnabled: z.boolean(),
    timezone: timezoneSchema,
    displayName: displayNameSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update.');

export const focusSessionSchema = z.strictObject({
  taskId: z.uuid().nullish(),
  durationSeconds: z.number().int().min(1).max(4 * 60 * 60),
  completed: z.boolean(),
  startedAt: z.iso.datetime({ offset: true }),
});

export const taskQuerySchema = z.strictObject({
  view: z.enum(['inbox', 'today', 'upcoming', 'completed', 'important', 'all']).default('all'),
  search: z.string().trim().max(120).optional(),
  priority: prioritySchema.optional(),
  tag: tagNameSchema.optional(),
  sort: z.enum(['created', 'due', 'priority', 'title']).default('created'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(200).default(200),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
  timezone: timezoneSchema.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;
