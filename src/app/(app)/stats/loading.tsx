import { Skeleton } from '@/components/ui/Card';

export default function Loading() {
  return <div className="mx-auto max-w-3xl space-y-4 px-4 py-8"><Skeleton className="h-8 w-40" /><Skeleton className="h-40 w-full" /><Skeleton className="h-28 w-full" /></div>;
}
