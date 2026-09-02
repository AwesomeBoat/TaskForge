import { Suspense } from 'react';
import { FocusMode } from '@/features/focus/FocusMode';

export default function FocusRoute() {
  return (
    <Suspense fallback={null}>
      <FocusMode />
    </Suspense>
  );
}
