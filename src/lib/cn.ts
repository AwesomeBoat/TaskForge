type ClassValue = string | false | null | undefined;

/** Tiny class joiner — enough for a codebase that owns all of its class names. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
