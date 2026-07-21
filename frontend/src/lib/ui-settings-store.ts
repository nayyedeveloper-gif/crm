import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';
export type NavLayout = 'side' | 'top' | 'mix';
export type ThemeColorId =
  | 'blue'
  | 'cyan'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'pink'
  | 'purple';

export const THEME_COLORS: Record<ThemeColorId, { label: string; swatch: string; hsl: string }> = {
  blue: { label: 'Blue', swatch: '#1677ff', hsl: '215 100% 54%' },
  cyan: { label: 'Cyan', swatch: '#13c2c2', hsl: '188 78% 41%' },
  green: { label: 'Green', swatch: '#52c41a', hsl: '102 61% 43%' },
  yellow: { label: 'Yellow', swatch: '#faad14', hsl: '40 96% 53%' },
  orange: { label: 'Orange', swatch: '#fa8c16', hsl: '28 95% 53%' },
  red: { label: 'Red', swatch: '#f5222d', hsl: '357 89% 55%' },
  pink: { label: 'Pink', swatch: '#eb2f96', hsl: '330 78% 55%' },
  purple: { label: 'Purple', swatch: '#722ed1', hsl: '270 65% 50%' },
};

export interface UiSettings {
  themeMode: ThemeMode;
  themeColor: ThemeColorId;
  navLayout: NavLayout;
  showFooter: boolean;
  compactHeader: boolean;
}

interface UiSettingsState extends UiSettings {
  hydrated: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setThemeColor: (color: ThemeColorId) => void;
  setNavLayout: (layout: NavLayout) => void;
  setShowFooter: (value: boolean) => void;
  setCompactHeader: (value: boolean) => void;
  hydrate: () => void;
}

const STORAGE_KEY = 'sale-crm-ui-settings';

const DEFAULTS: UiSettings = {
  themeMode: 'light',
  themeColor: 'blue',
  navLayout: 'top',
  showFooter: true,
  compactHeader: false,
};

function persist(settings: UiSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function readStored(): Partial<UiSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<UiSettings>;
  } catch {
    return {};
  }
}

export function applyUiSettings(settings: UiSettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const wantsDark =
    settings.themeMode === 'dark' ||
    (settings.themeMode === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  root.classList.toggle('dark', wantsDark);

  const color = THEME_COLORS[settings.themeColor] ?? THEME_COLORS.blue;
  root.style.setProperty('--primary', color.hsl);
  root.style.setProperty('--ring', color.hsl);
  root.dataset.navLayout = settings.navLayout;
}

export const useUiSettingsStore = create<UiSettingsState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,

  hydrate: () => {
    const stored = readStored();
    const next: UiSettings = { ...DEFAULTS, ...stored };
    set({ ...next, hydrated: true });
    applyUiSettings(next);
  },

  setThemeMode: (themeMode) => {
    const next = { ...pick(get()), themeMode };
    set({ themeMode });
    persist(next);
    applyUiSettings(next);
  },

  setThemeColor: (themeColor) => {
    const next = { ...pick(get()), themeColor };
    set({ themeColor });
    persist(next);
    applyUiSettings(next);
  },

  setNavLayout: (navLayout) => {
    const next = { ...pick(get()), navLayout };
    set({ navLayout });
    persist(next);
    applyUiSettings(next);
  },

  setShowFooter: (showFooter) => {
    const next = { ...pick(get()), showFooter };
    set({ showFooter });
    persist(next);
  },

  setCompactHeader: (compactHeader) => {
    const next = { ...pick(get()), compactHeader };
    set({ compactHeader });
    persist(next);
  },
}));

function pick(state: UiSettingsState): UiSettings {
  return {
    themeMode: state.themeMode,
    themeColor: state.themeColor,
    navLayout: state.navLayout,
    showFooter: state.showFooter,
    compactHeader: state.compactHeader,
  };
}
