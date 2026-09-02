import { describe, expect, it } from 'vitest';
import { parseQuickAdd } from '../src/features/tasks/quick-add';

describe('parseQuickAdd', () => {
  it('extracts priority, tag, and relative date', () => {
    expect(parseQuickAdd('Finish report tomorrow #work !high', '2026-09-02')).toEqual({
      title: 'Finish report',
      priority: 'high',
      dueDate: '2026-09-03',
      tags: ['work'],
    });
  });

  it('keeps unknown tokens in the title', () => {
    expect(parseQuickAdd('Buy !flowers #home', '2026-09-02').title).toBe('Buy !flowers');
  });
});
