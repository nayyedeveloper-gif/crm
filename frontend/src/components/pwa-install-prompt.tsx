'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DISMISS_UNTIL_KEY = 'sale-crm-pwa-dismiss-until';
const INSTALLED_KEY = 'sale-crm-pwa-installed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function wasDismissedRecently(): boolean {
  try {
    const until = Number(localStorage.getItem(DISMISS_UNTIL_KEY) || '0');
    return until > Date.now();
  } catch {
    return false;
  }
}

/**
 * Shows Install until the app is installed (standalone). Hidden after install.
 */
export function PwaInstallPrompt({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [iosMode, setIosMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone()) {
      try {
        localStorage.setItem(INSTALLED_KEY, '1');
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      if (localStorage.getItem(INSTALLED_KEY) === '1' && isStandalone()) return;
    } catch {
      /* ignore */
    }
    if (wasDismissedRecently()) return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    const show = () => {
      setVisible(true);
      window.requestAnimationFrame(() => {
        window.setTimeout(() => setEntered(true), 30);
      });
    };

    if (isIos()) {
      setIosMode(true);
      const t = window.setTimeout(show, 1400);
      return () => window.clearTimeout(t);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      show();
    };
    const onInstalled = () => {
      try {
        localStorage.setItem(INSTALLED_KEY, '1');
      } catch {
        /* ignore */
      }
      setVisible(false);
      setDeferred(null);
    };

    // Soft delay so the shop loads first, then invite install
    const t = window.setTimeout(show, 1800);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    setEntered(false);
    window.setTimeout(() => setVisible(false), 180);
    try {
      localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    } catch {
      /* ignore */
    }
  }

  async function install() {
    setHint('');
    if (iosMode) {
      setHint('Safari Share → Add to Home Screen ကိုနှိပ်ပါ။');
      return;
    }
    if (deferred) {
      setBusy(true);
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === 'accepted') {
          try {
            localStorage.setItem(INSTALLED_KEY, '1');
          } catch {
            /* ignore */
          }
          setVisible(false);
        }
        setDeferred(null);
      } catch {
        setHint('Install မရပါ — browser menu မှ Add to Home screen သုံးပါ။');
      } finally {
        setBusy(false);
      }
      return;
    }
    setHint('Browser menu (⋮) → Install app / Add to Home screen ကိုနှိပ်ပါ။');
  }

  if (!visible || isStandalone()) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-0 z-[70] px-3 transition-all duration-300 ease-out',
        'bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]',
        entered ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        className
      )}
      role="dialog"
      aria-label="Install app"
    >
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.14)] ring-1 ring-black/5">
        <div className="flex items-start gap-3.5 p-4">
          <div className="mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-white shadow-sm ring-1 ring-[#e5e5ea]">
            { }
            <img
              src="/icons/icon-192.png"
              alt=""
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-tight text-[#1c1c1e]">
                  29 Shop
                </p>
                <p className="mt-0.5 text-[12px] text-[#8e8e93]">Install app</p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-[#8e8e93] active:bg-[#f2f2f7]"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-[13px] leading-relaxed text-[#636366]">
              {iosMode ? (
                <>
                  <Share className="mx-0.5 inline h-3.5 w-3.5 text-[#007aff]" /> Share →{' '}
                  <span className="font-medium text-[#1c1c1e]">Add to Home Screen</span>
                </>
              ) : (
                'Home screen မှာ ထည့်ပြီး ပိုမြန်မြန် ဖွင့်နိုင်ပါတယ်။'
              )}
            </p>

            {hint ? (
              <p className="mt-2 rounded-lg bg-[#007aff]/08 px-2.5 py-1.5 text-[12px] leading-snug text-[#007aff]">
                {hint}
              </p>
            ) : null}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={install}
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#007aff] text-[14px] font-semibold text-white active:bg-[#0066d6] disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {busy ? 'Installing…' : 'Install'}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#f2f2f7] px-3.5 text-[14px] font-medium text-[#1c1c1e] active:bg-[#e5e5ea]"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
