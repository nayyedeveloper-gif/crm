'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

/** Cap parallel authenticated image downloads to avoid connection storms. */
const MAX_CONCURRENT_AUTH_IMAGES = 4;
const MAX_FETCH_ATTEMPTS = 3;

type QueueJob = {
  run: () => Promise<void>;
};

const authImageQueue: QueueJob[] = [];
let authImageActive = 0;

function pumpAuthImageQueue() {
  while (authImageActive < MAX_CONCURRENT_AUTH_IMAGES && authImageQueue.length > 0) {
    const job = authImageQueue.shift();
    if (!job) return;
    authImageActive += 1;
    void job.run().finally(() => {
      authImageActive -= 1;
      pumpAuthImageQueue();
    });
  }
}

function enqueueAuthImageFetch<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    authImageQueue.push({
      run: async () => {
        try {
          resolve(await task());
        } catch (err) {
          reject(err);
        }
      },
    });
    pumpAuthImageQueue();
  });
}

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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableNetworkError(err: unknown): boolean {
  const e = err as {
    code?: string;
    message?: string;
    response?: unknown;
  };
  if (e?.response) return false;
  const msg = `${e?.code || ''} ${e?.message || ''}`.toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('connection') ||
    msg.includes('timeout') ||
    msg.includes('err_connection') ||
    msg.includes('econnreset') ||
    msg.includes('econnaborted')
  );
}

async function fetchAuthBlobOnce(path: string): Promise<Blob> {
  const res = await api.get(path, {
    responseType: 'blob',
    timeout: 45000,
    headers: { Accept: 'image/*,*/*' },
  });
  return res.data as Blob;
}

async function fetchAuthBlobWithRetry(path: string): Promise<Blob> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
    try {
      return await enqueueAuthImageFetch(() => fetchAuthBlobOnce(path));
    } catch (err) {
      lastError = err;
      if (attempt >= MAX_FETCH_ATTEMPTS || !isRetryableNetworkError(err)) {
        throw err;
      }
      await sleep(250 * attempt * attempt);
    }
  }
  throw lastError;
}

/** Fetch a protected CRM image as Blob (for download). */
export async function fetchAuthImageBlob(src: string, cacheKey?: string): Promise<Blob> {
  const fetchUrl = withCacheKey(src, cacheKey);
  return fetchAuthBlobWithRetry(toApiPath(fetchUrl));
}

/** Load CRM-protected image URLs (e.g. /showcase/.../images/...) with the JWT from api client. */
export function useAuthImageSrc(
  src: string | null | undefined,
  cacheKey?: string,
  enabled = true
): string | null {
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    if (!src || !enabled) {
      setResolved(null);
      return;
    }

    if (isDirectSrc(src)) {
      setResolved(src);
      return;
    }

    const fetchUrl = withCacheKey(src, cacheKey);

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
        const blob = await fetchAuthBlobWithRetry(toApiPath(fetchUrl));
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setResolved(objectUrl);
      } catch {
        if (!cancelled) setResolved(null);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, cacheKey, enabled]);

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
  const containerRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px', threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  const resolved = useAuthImageSrc(src, cacheKey, visible);

  return (
    <span ref={containerRef} className="block h-full w-full">
      {resolved ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolved} alt={alt} className={className} loading="lazy" decoding="async" />
      ) : null}
    </span>
  );
}
