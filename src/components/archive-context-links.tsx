'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, type ComponentProps } from 'react';
import { safeReturnTo } from '@/lib/archive-context';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: string };
function ContextLink({ href, ...props }: Props) {
  const params = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));
  return <Link prefetch={false} {...props} href={returnTo ? `${href}?returnTo=${encodeURIComponent(returnTo)}` : href} />;
}
export function ProblemContextLink(props: Props) {
  return <Suspense fallback={<Link prefetch={false} {...props} />}><ContextLink {...props} /></Suspense>;
}
function ReturnLink() {
  const params = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));
  return <Link href={returnTo ?? '/archive'} prefetch={false} className="text-link">{returnTo?.startsWith('/my-learning') ? '← Back to My Learning' : returnTo ? '← Back to filtered results' : '← Problem Archive'}</Link>;
}
export function ArchiveReturnLink() {
  return <Suspense fallback={<Link href="/archive" prefetch={false} className="text-link">← Problem Archive</Link>}><ReturnLink /></Suspense>;
}
