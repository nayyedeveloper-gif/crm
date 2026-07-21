'use client';

import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  THEME_COLORS,
  type ThemeColorId,
  type NavLayout,
  useUiSettingsStore,
} from '@/lib/ui-settings-store';

export default function AppearanceSettingsPage() {
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

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-3 sm:p-6">
      <header>
        <h2 className="hidden text-base font-medium text-[#262626] md:block dark:text-neutral-100">
          Appearance
        </h2>
        <p className="text-sm text-[#8c8c8c] md:mt-1">Theme, color, and layout preferences</p>
      </header>

      <section>
        <p className="mb-3 text-sm text-[#595959] dark:text-neutral-400">Theme Mode</p>
        <div className="grid grid-cols-3 gap-2.5">
          {(
            [
              ['light', 'Light', Sun, '#faad14'],
              ['dark', 'Dark', Moon, '#1677ff'],
              ['system', 'System', Monitor, '#8c8c8c'],
            ] as const
          ).map(([mode, label, Icon, color]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setThemeMode(mode)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border bg-white px-2 py-3 dark:bg-neutral-900',
                themeMode === mode
                  ? 'border-primary ring-1 ring-primary'
                  : 'border-[#f0f0f0] hover:border-[#d9d9d9] dark:border-neutral-700'
              )}
            >
              <div className="flex h-10 w-full items-center justify-center rounded-md bg-[#fafafa] dark:bg-neutral-800">
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <span className="text-xs text-[#595959] dark:text-neutral-400">{label}</span>
            </button>
          ))}
        </div>
      </section>

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
                  active && 'ring-2 ring-offset-2 ring-primary dark:ring-offset-neutral-950'
                )}
                style={{ backgroundColor: c.swatch }}
              >
                {active && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <p className="mb-3 text-sm text-[#595959] dark:text-neutral-400">Navigation Layout</p>
        <div className="grid grid-cols-3 gap-2.5">
          {(['side', 'top', 'mix'] as NavLayout[]).map((variant) => (
            <button
              key={variant}
              type="button"
              onClick={() => setNavLayout(variant)}
              className={cn(
                'rounded-lg border p-1.5',
                navLayout === variant
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
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-sm text-[#595959] dark:text-neutral-400">Options</p>
        <ToggleRow label="Show Footer" checked={showFooter} onChange={setShowFooter} />
        <ToggleRow label="Compact Header" checked={compactHeader} onChange={setCompactHeader} />
      </section>
    </div>
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#f0f0f0] bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
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
