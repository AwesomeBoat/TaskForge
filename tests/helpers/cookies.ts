/**
 * Stand-in for `next/headers` so route handlers can be exercised outside a
 * Next request scope. Test files opt in with:
 *
 *   vi.mock('next/headers', async () => (await import('../helpers/cookies')).nextHeaders);
 */
const jar = new Map<string, string>();

export const nextHeaders = {
  cookies: async () => ({
    get: (name: string) => {
      const value = jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string, options?: { maxAge?: number }) => {
      if (value === '' || options?.maxAge === 0) jar.delete(name);
      else jar.set(name, value);
    },
    delete: (name: string) => {
      jar.delete(name);
    },
  }),
  headers: async () => new Headers(),
};

export function setCookie(name: string, value: string): void {
  jar.set(name, value);
}

export function getCookie(name: string): string | undefined {
  return jar.get(name);
}

export function clearCookieJar(): void {
  jar.clear();
}
