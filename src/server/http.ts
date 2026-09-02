import { ZodError } from 'zod';
import { getEnv, isProduction } from '@/lib/env';
import type { ApiErrorBody } from '@/types';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new HttpError(400, message, 'bad_request', fields);
export const unauthorized = (message = 'You need to sign in to do that.') =>
  new HttpError(401, message, 'unauthorized');
export const forbidden = (message = 'You do not have access to that.') => new HttpError(403, message, 'forbidden');
export const notFound = (message = 'Not found.') => new HttpError(404, message, 'not_found');
export const conflict = (message: string) => new HttpError(409, message, 'conflict');
export const tooManyRequests = (message: string, retryAfter: number) =>
  new HttpError(429, message, 'rate_limited', { retryAfter: String(retryAfter) });

export function json<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
}

/**
 * Single funnel for API errors: expected failures answer with a useful message,
 * anything unexpected is logged server-side and answers with a generic one.
 */
export async function apiHandler(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof HttpError) {
      const body: ApiErrorBody = { error: error.message, code: error.code, fields: error.fields };
      const headers = new Headers();
      if (error.status === 429 && error.fields?.retryAfter) headers.set('Retry-After', error.fields.retryAfter);
      return Response.json(body, { status: error.status, headers });
    }
    if (error instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of error.issues) {
        const key = issue.path.join('.') || 'form';
        fields[key] ??= issue.message;
      }
      return Response.json({ error: 'Some fields need attention.', code: 'validation_error', fields }, { status: 400 });
    }
    if (isUniqueViolation(error)) {
      return Response.json({ error: 'That already exists.', code: 'conflict' }, { status: 409 });
    }
    console.error('[api] unhandled error:', error);
    return Response.json(
      {
        error: 'Something went wrong. Try again.',
        code: 'internal_error',
        ...(isProduction() ? {} : { detail: error instanceof Error ? error.message : String(error) }),
      },
      { status: 500 },
    );
  }
}

/**
 * CSRF defence in depth: session cookies are SameSite=Lax (so a cross-site form
 * post carries no credentials), and every state-changing request must also carry
 * an Origin header matching this deployment.
 */
export function assertSameOrigin(request: Request): void {
  if (request.method === 'GET' || request.method === 'HEAD') return;

  const origin = request.headers.get('origin');
  if (!origin) throw forbidden('Missing origin header.');

  const candidates = [getEnv().APP_URL];
  const host = request.headers.get('host');
  if (host) candidates.push(`http://${host}`, `https://${host}`);

  const toOrigin = (value: string): string | null => {
    try {
      return new URL(value).origin;
    } catch {
      return null;
    }
  };

  const requestOrigin = toOrigin(origin);
  const permitted = candidates.map(toOrigin).filter((value): value is string => value !== null);
  if (!requestOrigin || !permitted.includes(requestOrigin)) throw forbidden('Cross-origin request blocked.');
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest('Expected a JSON body.');
  }
}
