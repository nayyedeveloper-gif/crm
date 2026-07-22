/** Non-destructive photo adjustments for Showcase / shop images. */

export type ImageAdjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  temperature: number;
  tint: number;
  highlights: number;
  shadows: number;
  vibrance: number;
  sharpness: number;
  vignette: number;
};

export type ImageFilterId =
  | 'none'
  | 'natural'
  | 'warm-gold'
  | 'cool-silver'
  | 'vivid'
  | 'soft'
  | 'vintage'
  | 'noir'
  | 'matte';

export type ImageFilterPreset = {
  id: ImageFilterId;
  label: string;
  description: string;
  adjustments: Partial<ImageAdjustments>;
  cssExtra?: string;
};

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  vibrance: 0,
  sharpness: 0,
  vignette: 0,
};

export const IMAGE_FILTER_PRESETS: ImageFilterPreset[] = [
  { id: 'none', label: 'Original', description: 'No filter', adjustments: {} },
  {
    id: 'natural',
    label: 'Natural',
    description: 'Balanced jewellery look',
    adjustments: { contrast: 6, saturation: 4, vibrance: 8, sharpness: 12 },
  },
  {
    id: 'warm-gold',
    label: 'Warm Gold',
    description: 'Rich gold tones',
    adjustments: { temperature: 18, saturation: 10, contrast: 8, vibrance: 6, exposure: 4 },
  },
  {
    id: 'cool-silver',
    label: 'Cool Silver',
    description: 'Platinum / diamond cool tone',
    adjustments: { temperature: -16, tint: -4, contrast: 10, saturation: -6, sharpness: 14 },
  },
  {
    id: 'vivid',
    label: 'Vivid',
    description: 'Punchy catalog pop',
    adjustments: { contrast: 14, saturation: 18, vibrance: 22, sharpness: 10, exposure: 5 },
  },
  {
    id: 'soft',
    label: 'Soft',
    description: 'Gentle showroom glow',
    adjustments: { brightness: 6, contrast: -8, saturation: -4, highlights: -10, shadows: 12 },
  },
  {
    id: 'vintage',
    label: 'Vintage',
    description: 'Warm faded film',
    adjustments: { temperature: 12, contrast: -6, saturation: -12, shadows: 8, vignette: 28 },
    cssExtra: 'sepia(0.12)',
  },
  {
    id: 'noir',
    label: 'Noir',
    description: 'High-contrast B&W',
    adjustments: { contrast: 22, brightness: -4, sharpness: 16, vignette: 18 },
    cssExtra: 'grayscale(1)',
  },
  {
    id: 'matte',
    label: 'Matte',
    description: 'Lifted shadows, soft contrast',
    adjustments: { contrast: -10, shadows: 18, highlights: -12, saturation: -6, brightness: 4 },
  },
];

export function mergeAdjustments(
  base: ImageAdjustments,
  patch: Partial<ImageAdjustments>
): ImageAdjustments {
  return { ...base, ...patch };
}

export function effectiveAdjustments(
  manual: ImageAdjustments,
  filterId: ImageFilterId
): ImageAdjustments {
  const preset = IMAGE_FILTER_PRESETS.find((p) => p.id === filterId);
  if (!preset || filterId === 'none') return manual;
  return mergeAdjustments(manual, preset.adjustments);
}

export function adjustmentsChanged(
  a: ImageAdjustments,
  b: ImageAdjustments = DEFAULT_ADJUSTMENTS
): boolean {
  return (Object.keys(DEFAULT_ADJUSTMENTS) as (keyof ImageAdjustments)[]).some(
    (k) => a[k] !== b[k]
  );
}

function clamp01(v: number) {
  return Math.min(255, Math.max(0, v));
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = l * 255;
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    hue2rgb(p, q, h + 1 / 3) * 255,
    hue2rgb(p, q, h) * 255,
    hue2rgb(p, q, h - 1 / 3) * 255,
  ];
}

/** Fast CSS filter string for live Cropper preview. */
export function buildCssImageFilter(
  manual: ImageAdjustments,
  filterId: ImageFilterId = 'none'
): string {
  const a = effectiveAdjustments(manual, filterId);
  const preset = IMAGE_FILTER_PRESETS.find((p) => p.id === filterId);
  const parts: string[] = [];

  const brightness = 1 + a.brightness / 100 + a.exposure / 200;
  const contrast = 1 + a.contrast / 100;
  const saturate = 1 + (a.saturation + a.vibrance * 0.5) / 100;

  parts.push(`brightness(${brightness.toFixed(3)})`);
  parts.push(`contrast(${contrast.toFixed(3)})`);
  parts.push(`saturate(${Math.max(0, saturate).toFixed(3)})`);

  if (a.temperature !== 0 || a.tint !== 0) {
    const hue = a.temperature * 0.35 + a.tint * 0.2;
    parts.push(`hue-rotate(${hue.toFixed(1)}deg)`);
  }

  if (preset?.cssExtra) parts.push(preset.cssExtra);
  return parts.join(' ');
}

export function applyAdjustmentsToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  manual: ImageAdjustments,
  filterId: ImageFilterId = 'none'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas not supported');

  ctx.drawImage(source, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const a = effectiveAdjustments(manual, filterId);
  const preset = IMAGE_FILTER_PRESETS.find((p) => p.id === filterId);

  const brightness = a.brightness / 100;
  const contrast = 1 + a.contrast / 100;
  const exposure = Math.pow(2, a.exposure / 50);
  const satFactor = 1 + (a.saturation + a.vibrance * 0.35) / 100;
  const temp = a.temperature / 100;
  const tint = a.tint / 100;
  const highlights = a.highlights / 100;
  const shadows = a.shadows / 100;
  const noir = filterId === 'noir';

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    r = clamp01((r - 128) * contrast + 128 + brightness * 128);
    g = clamp01((g - 128) * contrast + 128 + brightness * 128);
    b = clamp01((b - 128) * contrast + 128 + brightness * 128);

    r = clamp01(r * exposure);
    g = clamp01(g * exposure);
    b = clamp01(b * exposure);

    r = clamp01(r + temp * 28);
    b = clamp01(b - temp * 28);
    g = clamp01(g + tint * 18);

    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (lum > 0.55) {
      const lift = (lum - 0.55) / 0.45;
      const hAdj = highlights * 40 * lift;
      r = clamp01(r + hAdj);
      g = clamp01(g + hAdj);
      b = clamp01(b + hAdj);
    } else {
      const lift = (0.55 - lum) / 0.55;
      const sAdj = shadows * 40 * lift;
      r = clamp01(r + sAdj);
      g = clamp01(g + sAdj);
      b = clamp01(b + sAdj);
    }

    if (satFactor !== 1 || a.vibrance !== 0) {
      const [h, s, l] = rgbToHsl(r, g, b);
      const vibranceBoost = a.vibrance !== 0 ? (1 - s) * (a.vibrance / 100) * 0.8 : 0;
      const nextS = clamp(s * satFactor + vibranceBoost, 0, 1);
      [r, g, b] = hslToRgb(h, nextS, l);
    }

    if (noir) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = gray;
    } else if (preset?.cssExtra?.includes('sepia')) {
      const tr = 0.393 * r + 0.769 * g + 0.189 * b;
      const tg = 0.349 * r + 0.686 * g + 0.168 * b;
      const tb = 0.272 * r + 0.534 * g + 0.131 * b;
      r = clamp01(r * 0.88 + tr * 0.12);
      g = clamp01(g * 0.88 + tg * 0.12);
      b = clamp01(b * 0.88 + tb * 0.12);
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);

  if (a.sharpness > 0) {
    applySharpen(ctx, width, height, a.sharpness / 100);
  }

  if (a.vignette > 0) {
    applyVignette(ctx, width, height, a.vignette / 100);
  }

  return canvas;
}

function applySharpen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = imageData.data;
  const out = new Uint8ClampedArray(src);
  const kernel = [0, -amount, 0, -amount, 1 + 4 * amount, -amount, 0, -amount, 0];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += src[idx] * kernel[ki++];
          }
        }
        out[(y * width + x) * 4 + c] = clamp01(sum);
      }
    }
  }
  imageData.data.set(out);
  ctx.putImageData(imageData, 0, 0);
}

function applyVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number
) {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.2,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.72
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${Math.min(0.75, amount * 0.75)})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export type AdjustmentSliderDef = {
  key: keyof ImageAdjustments;
  label: string;
  min: number;
  max: number;
  step?: number;
};

export const ADJUSTMENT_SLIDERS: AdjustmentSliderDef[] = [
  { key: 'exposure', label: 'Exposure', min: -100, max: 100 },
  { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100 },
  { key: 'shadows', label: 'Shadows', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
  { key: 'vibrance', label: 'Vibrance', min: -100, max: 100 },
  { key: 'temperature', label: 'Temperature', min: -100, max: 100 },
  { key: 'tint', label: 'Tint', min: -100, max: 100 },
  { key: 'sharpness', label: 'Sharpness', min: 0, max: 100 },
  { key: 'vignette', label: 'Vignette', min: 0, max: 100 },
];
