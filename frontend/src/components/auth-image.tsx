'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

function isDirectSrc(src: string): boolean {
  return (
    src.startsWith('blob:') ||
    src.startsWith('data:') ||
    src.startsWith('http://') ||
    src.startsWith('https://')
  );
}

function needsAuthFetch(src: string): boolean {
  return src.includes('/showcase/') && !isDirectSrc(src);
}

function toApiPath(src: string): string {
  if (src.startsWith(API_BASE)) {
    const path = src.slice(API_BASE.length);
    return path.startsWith('/') ? path : `/${path}`;
  }
  if (src.startsWith('/api/')) return src.slice(4);
  if (src.startsWith('/showcase/')) return src;
  return src.startsWith('/') ? src : `/${src}`;
}

function withCacheKey(src: string, cacheKey?: string): string {
  if (!cacheKey) return src;
  const sep = src.includes('?') ? '&' : '?';
  return `${src}${sep}v=${encodeURIComponent(cacheKey)}`;
}

/** Fetch a protected CRM image as Blob (for download). */
export async function fetchAuthImageBlob(src: string, cacheKey?: string): Promise<Blob> {
  const fetchUrl = withCacheKey(src, cacheKey);
  const res = await api.get(toApiPath(fetchUrl), { responseType: 'blob' });
  return res.data as Blob;
}

/** Load CRM-protected image URLs (e.g. /showcase/.../images/...) with the JWT from api client. */
export function useAuthImageSrc(
  src: string | null | undefined,
  cacheKey?: string
): string | null {
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setResolved(null);
      return;
    }

    if (isDirectSrc(src)) {
      setResolved(src);
      return;
    }

    let fetchUrl = withCacheKey(src, cacheKey);

    if (!needsAuthFetch(fetchUrl)) {
      const full = fetchUrl.startsWith('/api/')
        ? fetchUrl
        : fetchUrl.startsWith('/')
          ? `${API_BASE}${fetchUrl}`
          : `${API_BASE}/${fetchUrl}`;
      setResolved(full);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    void (async () => {
      try {
        const res = await api.get(toApiPath(fetchUrl), { responseType: 'blob' });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setResolved(objectUrl);
      } catch {
        if (!cancelled) setResolved(null);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, cacheKey]);

  return resolved;
}

export function AuthImage({
  src,
  cacheKey,
  alt,
  className,
}: {
  src: string;
  cacheKey?: string;
  alt: string;
  className?: string;
}) {
  const resolved = useAuthImageSrc(src, cacheKey);

  if (!resolved) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolved} alt={alt} className={className} />
  );
}
