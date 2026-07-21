'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const CONFIG_ERROR = GOOGLE_CLIENT_ID
  ? ''
  : 'Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google Sign-In';

/**
 * Google Identity Services button. Requires NEXT_PUBLIC_GOOGLE_CLIENT_ID
 * and matching SHOP_GOOGLE_CLIENT_ID on the backend.
 */
export function GoogleSignInButton({
  onCredential,
  disabled,
}: {
  onCredential: (idToken: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState('');
  const [ready, setReady] = useState(false);
  const error = CONFIG_ERROR || loadError;
  const onCredentialRef = useRef(onCredential);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    let cancelled = false;

    function mount() {
      if (cancelled || !hostRef.current || !window.google?.accounts?.id) return;
      hostRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential?: string }) => {
          if (response.credential) await onCredentialRef.current(response.credential);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.renderButton(hostRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 280,
      });
      if (!cancelled) setReady(true);
    }

    const existing = document.querySelector('script[data-google-gsi]');
    if (existing) {
      mount();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = '1';
    script.onload = () => mount();
    script.onerror = () => {
      if (!cancelled) setLoadError('Could not load Google Sign-In');
    };
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-xl bg-white px-4 py-3 text-center text-sm text-[#8e8e93] shadow-sm">
        {error}
      </p>
    );
  }

  return (
    <div className={disabled ? 'pointer-events-none opacity-50' : undefined}>
      <div ref={hostRef} className="flex min-h-[44px] justify-center" />
      {!ready && <p className="mt-2 text-center text-xs text-[#8e8e93]">Loading Google…</p>}
    </div>
  );
}
