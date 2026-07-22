'use client';

import { useEffect, useRef } from 'react';

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
  // Use index.html explicitly — Next.js 308-strips /sales-app/ → /sales-app (404)
  const srcRef = useRef(`/sales-app/index.html?embed=1&tab=${encodeURIComponent(view)}`);

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow || !readyRef.current) return;
    frame.contentWindow.postMessage(
      { type: 'sales-set-tab', tab: view },
      window.location.origin
    );
  }, [view]);

  return (
    <div className="-m-4 flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col md:-m-5">
      <iframe
        ref={iframeRef}
        title="Sales Dashboard"
        src={srcRef.current}
        className="h-full w-full flex-1 border-0 bg-[#f5f5f5]"
        allow="clipboard-write"
        onLoad={() => {
          readyRef.current = true;
          iframeRef.current?.contentWindow?.postMessage(
            { type: 'sales-set-tab', tab: view },
            window.location.origin
          );
        }}
      />
    </div>
  );
}
