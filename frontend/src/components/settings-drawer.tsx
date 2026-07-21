'use client';

import { useEffect } from 'react';
import { X, Sun, Moon, Monitor, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  THEME_COLORS,
  type ThemeColorId,
  type NavLayout,
  useUiSettingsStore,
} from '@/lib/ui-settings-store';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const {
    themeMode,
    themeColor,
    navLayout,
    showFooter,
    compactHeader,
    setThemeMode,
    setThemeColor,
    setNavLayout,
    setShowFooter,
    setCompactHeader,
  } = useUiSettingsStore();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-black/45 transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={cn(
          'fixed right-0 top-0 z-[70] flex h-full w-[320px] max-w-[90vw] flex-col bg-white shadow-[-6px_0_16px_rgba(0,0,0,0.08)] transition-transform duration-300 dark:bg-[#141414] dark:shadow-black/40',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Page configuration"
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#f0f0f0] px-4 dark:border-[#303030]">
          <h2 className="text-[15px] font-medium text-[#262626] dark:text-neutral-100">
            Page Configuration
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#8c8c8c] hover:bg-[#f5f5f5] hover:text-[#595959] dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto px-4 py-5">
          {/* Theme mode */}
          <section>
            <p className="mb-3 text-sm text-[#595959] dark:text-neutral-400">Theme Mode</p>
            <div className="grid grid-cols-3 gap-2.5">
              <ModeCard
                active={themeMode === 'light'}
                label="Light"
                onClick={() => setThemeMode('light')}
              >
                <Sun className="h-5 w-5 text-[#faad14]" />
              </ModeCard>
              <ModeCard
                active={themeMode === 'dark'}
                label="Dark"
                onClick={() => setThemeMode('dark')}
              >
                <Moon className="h-5 w-5 text-[#1677ff]" />
              </ModeCard>
              <ModeCard
                active={themeMode === 'system'}
                label="System"
                onClick={() => setThemeMode('system')}
              >
                <Monitor className="h-5 w-5 text-[#8c8c8c]" />
              </ModeCard>
            </div>
          </section>

          {/* Theme color */}
          <section>
            <p className="mb-3 text-sm text-[#595959] dark:text-neutral-400">Theme Color</p>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(THEME_COLORS) as ThemeColorId[]).map((id) => {
                const c = THEME_COLORS[id];
                const active = themeColor === id;
                return (
                  <button
                    key={id}
                    type="button"
                    title={c.label}
                    onClick={() => setThemeColor(id)}
                    className={cn(
                      'relative flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110',
                      active && 'ring-2 ring-offset-2 ring-primary dark:ring-offset-[#141414]'
                    )}
                    style={{ backgroundColor: c.swatch }}
                  >
                    {active && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Navigation layout */}
          <section>
            <p className="mb-3 text-sm text-[#595959] dark:text-neutral-400">Navigation Layout</p>
            <div className="grid grid-cols-3 gap-2.5">
              <LayoutCard
                active={navLayout === 'side'}
                onClick={() => setNavLayout('side')}
                variant="side"
              />
              <LayoutCard
                active={navLayout === 'top'}
                onClick={() => setNavLayout('top')}
                variant="top"
              />
              <LayoutCard
                active={navLayout === 'mix'}
                onClick={() => setNavLayout('mix')}
                variant="mix"
              />
            </div>
          </section>

          {/* Toggles */}
          <section className="space-y-4">
            <p className="text-sm text-[#595959] dark:text-neutral-400">Options</p>
            <ToggleRow
              label="Show Footer"
              checked={showFooter}
              onChange={setShowFooter}
            />
            <ToggleRow
              label="Compact Header"
              checked={compactHeader}
              onChange={setCompactHeader}
            />
          </section>
        </div>
      </aside>
    </>
  );
}

function ModeCard({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border bg-[#fafafa] px-2 py-3 transition-colors dark:bg-neutral-900',
        active
          ? 'border-primary ring-1 ring-primary'
          : 'border-[#f0f0f0] hover:border-[#d9d9d9] dark:border-neutral-700'
      )}
    >
      <div className="flex h-10 w-full items-center justify-center rounded-md bg-white dark:bg-neutral-800">
        {children}
      </div>
      <span className="text-xs text-[#595959] dark:text-neutral-400">{label}</span>
    </button>
  );
}

function LayoutCard({
  active,
  onClick,
  variant,
}: {
  active: boolean;
  onClick: () => void;
  variant: NavLayout;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border p-1.5 transition-colors',
        active
          ? 'border-primary ring-1 ring-primary'
          : 'border-[#f0f0f0] hover:border-[#d9d9d9] dark:border-neutral-700'
      )}
      aria-label={variant}
    >
      <div className="flex h-14 overflow-hidden rounded bg-[#f5f5f5] dark:bg-neutral-900">
        {variant === 'side' && (
          <>
            <div className="w-3 bg-[#001529]" />
            <div className="flex-1 p-1.5">
              <div className="mb-1 h-1.5 rounded bg-white dark:bg-neutral-700" />
              <div className="h-full rounded bg-white/80 dark:bg-neutral-800" />
            </div>
          </>
        )}
        {variant === 'top' && (
          <div className="flex w-full flex-col">
            <div className="h-2.5 bg-[#001529]" />
            <div className="flex-1 p-1.5">
              <div className="h-full rounded bg-white dark:bg-neutral-800" />
            </div>
          </div>
        )}
        {variant === 'mix' && (
          <>
            <div className="w-3 bg-[#001529]" />
            <div className="flex flex-1 flex-col">
              <div className="h-2.5 bg-[#001529]/80" />
              <div className="flex-1 p-1.5">
                <div className="h-full rounded bg-white dark:bg-neutral-800" />
              </div>
            </div>
          </>
        )}
      </div>
    </button>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-[#262626] dark:text-neutral-200">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-10 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-[#00000040] dark:bg-neutral-600'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'left-5' : 'left-0.5'
          )}
        />
      </button>
    </div>
  );
}
