'use client';

import { useEffect, useRef, useState } from 'react';

export type SalesView =
  | 'overview'
  | 'chairman'
  | 'staff'
  | 'cm'
  | 'crm'
  | 'detail';

/**
 * Embeds the standalone Sales Vite SPA.
 * Data comes from CRM PostgreSQL via /api/sales/* — Google Sheets are not used.
 */
export function SalesEmbed({ view }: { view: SalesView }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const [frameReady, setFrameReady] = useState(false);
  // Keep iframe source stable; route tab changes through postMessage.
  const src = '/sales-app/index.html?embed=1';

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow || !readyRef.current) return;
    frame.contentWindow.postMessage(
      { type: 'sales-set-tab', tab: view },
      window.location.origin
    );
  }, [view]);

  return (
    <div className="relative -m-4 flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col md:-m-5">
      {!frameReady && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#f5f5f5]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e8e8e8] border-t-primary" />
          <p className="text-sm text-[#8c8c8c]">Opening Sales…</p>
        </div>
      )}
      <iframe
        ref={iframeRef}
        title="Sales Dashboard"
        src={src}
        className="h-full w-full flex-1 border-0 bg-[#f5f5f5]"
        allow="clipboard-write"
        onLoad={() => {
          readyRef.current = true;
          setFrameReady(true);
          iframeRef.current?.contentWindow?.postMessage(
            { type: 'sales-set-tab', tab: view },
            window.location.origin
          );
        }}
      />
    </div>
  );
}
