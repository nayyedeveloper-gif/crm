'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Share2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShopCopy } from '@/components/shop/shop-chrome';

const DISMISS_KEY = 'sale-crm-invite-dismissed';

function inviteImageSrc(url: string | null | undefined): string {
  if (url) {
    return url.startsWith('http') ? url : `/api${url.startsWith('/') ? url : `/${url}`}`;
  }
  return '/shop/invite-default.png';
}

/**
 * Mobile-native invitation bottom sheet (slides up from bottom).
 */
export function InvitationPopup({ copy }: { copy: ShopCopy }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/shop?invite=1';
    return `${window.location.origin}/shop?invite=1`;
  }, []);

  const shareText = useMemo(() => {
    const parts = [
      copy.invitePopupTitle || 'Grand Opening',
      copy.invitePopupDate,
      copy.appName,
      copy.invitePopupSpecial,
    ].filter(Boolean);
    return parts.join(' · ');
  }, [copy]);

  useEffect(() => {
    if (!copy.invitePopupEnabled) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      /* ignore */
    }
    const force =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('invite') === '1';
    const t = window.setTimeout(() => {
      setOpen(true);
      requestAnimationFrame(() => setVisible(true));
    }, force ? 200 : 700);
    return () => window.clearTimeout(t);
  }, [copy.invitePopupEnabled]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function dismiss() {
    setVisible(false);
    window.setTimeout(() => setOpen(false), 280);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  async function share() {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: copy.invitePopupTitle || copy.appName,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    await copyLink();
  }

  if (!copy.invitePopupEnabled || !open) return null;

  const img = inviteImageSrc(copy.invitePopupImageUrl);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[80] flex flex-col justify-end transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      role="dialog"
      aria-modal="true"
      aria-label={copy.invitePopupTitle || 'Invitation'}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close invitation"
        onClick={dismiss}
      />

      <div
        className={cn(
          'relative z-10 mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.2)] transition duration-300 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Grabber */}
        <div className="flex shrink-0 justify-center pb-1 pt-2.5">
          <span className="h-1 w-10 rounded-full bg-[#d1d1d6]" />
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#f2f2f7] text-[#8e8e93] active:bg-[#e5e5ea]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="relative mx-4 mt-1 aspect-[4/5] overflow-hidden rounded-2xl bg-[#e5e5ea] sm:aspect-[16/11]">
            { }
            <img src={img} alt="" className="h-full w-full object-cover" />
          </div>

          <div className="space-y-2 px-5 pb-3 pt-4 text-center">
            <p className="text-[11px] tracking-[0.28em] text-[#8e8e93] uppercase">
              {copy.invitePopupTitle || 'Grand Opening'}
            </p>
            {copy.invitePopupDate ? (
              <p className="text-[15px] font-medium text-[#1c1c1e]">{copy.invitePopupDate}</p>
            ) : null}
            <p className="text-[22px] font-semibold tracking-tight text-[#1c1c1e]">{copy.appName}</p>
            {copy.invitePopupSpecial ? (
              <p className="mx-auto max-w-sm text-[15px] leading-relaxed text-[#8e8e93]">
                {copy.invitePopupSpecial}
              </p>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-t border-[#e5e5ea] bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#f2f2f7] text-[15px] font-medium text-[#1c1c1e] active:bg-[#e5e5ea]"
            >
              {copied ? (
                <Check className="h-4 w-4 text-[#34c759]" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button
              type="button"
              onClick={share}
              className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#007aff] text-[15px] font-semibold text-white active:bg-[#0066d6]"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="flex h-11 w-full items-center justify-center text-[15px] font-medium text-[#007aff] active:opacity-60"
          >
            Continue to collection
          </button>
        </div>
      </div>
    </div>
  );
}
