'use client';

import { useEffect, useState } from 'react';

/**
 * Keeps items that just left the list mounted for one animation, so a completed
 * task fades out instead of vanishing mid-click.
 */
export function useExitAnimation<T extends { id: string }>(items: T[], delay = 380) {
  const [rendered, setRendered] = useState<T[]>(items);

  useEffect(() => {
    const liveIds = new Set(items.map((item) => item.id));
    const removed = rendered.filter((item) => !liveIds.has(item.id));

    if (removed.length === 0) {
      setRendered(items);
      return;
    }

    const merged = [...items];
    for (const item of removed) {
      const previousIndex = rendered.findIndex((candidate) => candidate.id === item.id);
      merged.splice(Math.min(previousIndex, merged.length), 0, item);
    }
    setRendered(merged);

    const timer = window.setTimeout(() => setRendered(items), delay);
    return () => window.clearTimeout(timer);
    // `rendered` is intentionally excluded: reacting to it would re-trigger the exit.
  }, [items, delay]);

  const liveIds = new Set(items.map((item) => item.id));
  const leavingIds = new Set(rendered.filter((item) => !liveIds.has(item.id)).map((item) => item.id));

  return { rendered, leavingIds };
}
