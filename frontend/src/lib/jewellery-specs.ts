export type JewelleryKind = 'gold' | 'diamond' | 'platinum' | 'other';

export function jewelleryKind(category: string | null | undefined): JewelleryKind {
  const c = (category || '').trim().toLowerCase();
  if (!c) return 'other';
  if (
    c === 'pt' ||
    c.includes('plat') ||
    c.includes('ပလက်') ||
    c.includes('ပလက္ထ')
  ) {
    return 'platinum';
  }
  if (
    c === 'dm' ||
    c === 'dia' ||
    c.includes('diamond') ||
    c.includes('ဒိုင်း') ||
    c.includes('စိန်')
  ) {
    return 'diamond';
  }
  if (
    c === 'gd' ||
    c === 'au' ||
    c.includes('gold') ||
    c.includes('ရွှေ') ||
    c.includes('18k') ||
    c.includes('22k') ||
    c.includes('24k') ||
    c.includes('kyat')
  ) {
    return 'gold';
  }
  return 'other';
}

export type SpecRow = {
  key: string;
  label: string;
  value: string;
  emphasize?: boolean;
};

/** Category-aware jewellery specs for shop product detail. */
export function jewellerySpecRows(product: {
  category: string;
  metalPurity?: string | null;
  weightGram?: number | null;
  stoneCarat?: number | null;
}): SpecRow[] {
  const kind = jewelleryKind(product.category);
  const purity = product.metalPurity?.trim() || null;
  return buildSpecRows(kind, purity, product.weightGram, product.stoneCarat);
}

function buildSpecRows(
  kind: JewelleryKind,
  purity: string | null,
  weightGram: number | null | undefined,
  stoneCarat: number | null | undefined
): SpecRow[] {
  const rows: SpecRow[] = [];

  if (kind === 'diamond') {
    if (stoneCarat != null && stoneCarat > 0) {
      rows.push({
        key: 'stone',
        label: 'Diamond',
        value: formatDiamondInline(stoneCarat),
        emphasize: true,
      });
    }
    if (purity) rows.push({ key: 'purity', label: 'Setting metal', value: purity });
    if (weightGram != null && weightGram > 0) {
      rows.push({ key: 'weight', label: 'Setting weight', value: `${weightGram} g` });
    }
  } else if (kind === 'gold') {
    if (purity) {
      rows.push({ key: 'purity', label: 'Karat / Purity', value: purity, emphasize: true });
    }
    if (weightGram != null && weightGram > 0) {
      rows.push({
        key: 'weight',
        label: 'Gold weight',
        value: formatGoldInline(weightGram),
        emphasize: true,
      });
    }
    if (stoneCarat != null && stoneCarat > 0) {
      rows.push({ key: 'stone', label: 'Stone', value: `${stoneCarat} ct` });
    }
  } else if (kind === 'platinum') {
    if (purity) {
      rows.push({ key: 'purity', label: 'Platinum purity', value: purity, emphasize: true });
    }
    if (weightGram != null && weightGram > 0) {
      rows.push({ key: 'weight', label: 'Weight', value: `${weightGram} g` });
    }
    if (stoneCarat != null && stoneCarat > 0) {
      rows.push({
        key: 'stone',
        label: 'Diamond / Stone',
        value: formatDiamondInline(stoneCarat),
      });
    }
  } else {
    if (purity) rows.push({ key: 'purity', label: 'Purity', value: purity });
    if (weightGram != null && weightGram > 0) {
      rows.push({ key: 'weight', label: 'Weight', value: `${weightGram} g` });
    }
    if (stoneCarat != null && stoneCarat > 0) {
      rows.push({ key: 'stone', label: 'Stone', value: `${stoneCarat} ct` });
    }
  }

  return rows;
}

function formatGoldInline(gram: number): string {
  // Keep jewellery-specs free of heavy imports at top for SSR; inline light format
  const KYAT = 16.66666666;
  const YWAY_PER_KYAT = 128;
  const gramPerYway = KYAT / YWAY_PER_KYAT;
  let totalYway = gram / gramPerYway;
  const kyat = Math.floor(totalYway / YWAY_PER_KYAT + 1e-9);
  totalYway -= kyat * YWAY_PER_KYAT;
  const pae = Math.floor(totalYway / 8 + 1e-9);
  totalYway -= pae * 8;
  const yway = Math.round(totalYway * 100) / 100;
  const parts: string[] = [];
  if (kyat > 0) parts.push(`${kyat} ကျပ်`);
  if (pae > 0) parts.push(`${pae} ပဲ`);
  if (yway > 0) parts.push(`${yway} ရွေး`);
  parts.push(`${gram} g`);
  return parts.join(' · ');
}

function formatDiamondInline(carat: number): string {
  const points = Math.round(carat * 10000) / 100;
  const mg = Math.round(carat * 20000) / 100;
  return `${carat} ct · ${points} pt · ${mg} mg`;
}

export function jewelleryKindLabel(kind: JewelleryKind): string {
  switch (kind) {
    case 'gold':
      return 'Gold';
    case 'diamond':
      return 'Diamond';
    case 'platinum':
      return 'Platinum';
    default:
      return 'Jewellery';
  }
}

export function adminSpecLabels(category: string | null | undefined): {
  purity: string;
  weight: string;
  stone: string;
  purityPlaceholder: string;
} {
  const kind = jewelleryKind(category);
  if (kind === 'diamond') {
    return {
      purity: 'Setting metal',
      weight: 'Total weight (g)',
      stone: 'Diamond (ct)',
      purityPlaceholder: '18K / PT950',
    };
  }
  if (kind === 'gold') {
    return {
      purity: 'Karat / Purity',
      weight: 'Gold weight (g)',
      stone: 'Stone (ct)',
      purityPlaceholder: '18K / 22K / 24K',
    };
  }
  if (kind === 'platinum') {
    return {
      purity: 'Platinum purity',
      weight: 'Weight (g)',
      stone: 'Diamond / Stone (ct)',
      purityPlaceholder: 'PT950 / PT900',
    };
  }
  return {
    purity: 'Metal purity',
    weight: 'Weight (g)',
    stone: 'Stone (ct)',
    purityPlaceholder: '18K / 22K / PT950',
  };
}
