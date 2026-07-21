/**
 * Myanmar gold weight + diamond carat conversions.
 * Gold: 1 ကျပ် = 16 ပဲ = 128 ရွေး ≈ 16.66666666 g
 * Diamond: 1 ct = 100 pt = 200 mg = 0.2 g
 */

export const KYAT_TO_GRAM = 16.66666666;
export const PAE_PER_KYAT = 16;
export const YWAY_PER_PAE = 8;
export const YWAY_PER_KYAT = PAE_PER_KYAT * YWAY_PER_PAE; // 128
export const GRAM_PER_YWAY = KYAT_TO_GRAM / YWAY_PER_KYAT;

export const POINTS_PER_CARAT = 100;
export const MG_PER_CARAT = 200;
export const GRAM_PER_CARAT = 0.2;

function round(n: number, digits = 6): number {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function parseNum(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export type MyanmarWeightParts = {
  kyat: number;
  pae: number;
  yway: number;
};

export function myanmarPartsFromGram(gram: number): MyanmarWeightParts {
  if (!Number.isFinite(gram) || gram <= 0) {
    return { kyat: 0, pae: 0, yway: 0 };
  }
  let totalYway = gram / GRAM_PER_YWAY;
  const kyat = Math.floor(totalYway / YWAY_PER_KYAT + 1e-9);
  totalYway -= kyat * YWAY_PER_KYAT;
  const pae = Math.floor(totalYway / YWAY_PER_PAE + 1e-9);
  totalYway -= pae * YWAY_PER_PAE;
  const yway = round(totalYway, 4);
  return { kyat, pae, yway };
}

export function gramFromMyanmarParts(kyat: number, pae: number, yway: number): number {
  const totalYway =
    (Number(kyat) || 0) * YWAY_PER_KYAT +
    (Number(pae) || 0) * YWAY_PER_PAE +
    (Number(yway) || 0);
  return round(totalYway * GRAM_PER_YWAY, 6);
}

export function formatMyanmarWeight(gram: number | null | undefined): string | null {
  if (gram == null || !Number.isFinite(gram) || gram <= 0) return null;
  const { kyat, pae, yway } = myanmarPartsFromGram(gram);
  const parts: string[] = [];
  if (kyat > 0) parts.push(`${kyat} ကျပ်`);
  if (pae > 0) parts.push(`${pae} ပဲ`);
  if (yway > 0) parts.push(`${round(yway, 2)} ရွေး`);
  if (parts.length === 0) parts.push(`${round(gram, 3)} g`);
  return `${parts.join(' ')} · ${round(gram, 3)} g`;
}

export type DiamondParts = {
  carat: number;
  points: number;
  mg: number;
};

export function diamondPartsFromCarat(carat: number): DiamondParts {
  if (!Number.isFinite(carat) || carat <= 0) {
    return { carat: 0, points: 0, mg: 0 };
  }
  return {
    carat: round(carat, 4),
    points: round(carat * POINTS_PER_CARAT, 2),
    mg: round(carat * MG_PER_CARAT, 2),
  };
}

export function caratFromPoints(points: number): number {
  return round((Number(points) || 0) / POINTS_PER_CARAT, 6);
}

export function caratFromMg(mg: number): number {
  return round((Number(mg) || 0) / MG_PER_CARAT, 6);
}

export function formatDiamondWeight(carat: number | null | undefined): string | null {
  if (carat == null || !Number.isFinite(carat) || carat <= 0) return null;
  const d = diamondPartsFromCarat(carat);
  return `${d.carat} ct · ${d.points} pt · ${d.mg} mg`;
}

export function strOrEmpty(n: number, digits = 4): string {
  if (!n) return '';
  return String(round(n, digits));
}

export { parseNum };
