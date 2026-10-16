/** Only local archive/learning destinations may survive as return links. */
export function safeReturnTo(value: string | null): string | null {
  if (!value || value.length > 4096 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return null;
  try {
    const url = new URL(value, 'https://novaris.invalid');
    if (url.origin !== 'https://novaris.invalid' || !['/archive','/my-learning'].includes(url.pathname)) return null;
    url.searchParams.delete('returnTo');
    return url.pathname + url.search + url.hash;
  } catch { return null; }
}
export function problemHref(slug: string, returnTo: string | null) {
  const destination = safeReturnTo(returnTo);
  return `/archive/${slug}${destination ? `?returnTo=${encodeURIComponent(destination)}` : ''}`;
}
