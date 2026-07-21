/**
 * Full-viewport shop shell with bottom tabs.
 * Fills the screen on mobile, tablet, and desktop (responsive, not phone-framed).
 */
import type { ReactNode } from 'react';

export function ShopShell({ children }: { children: ReactNode }) {
  return (
    <div className="shop-stage">
      <div className="shop-shell">{children}</div>
    </div>
  );
}
