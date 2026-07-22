/**
 * Legacy distribution sheet helpers — Google Sheets are no longer used.
 * Kept as no-op stubs so old imports do not break builds.
 */
export const DISTRIBUTION_SHEET_URL = '';

export type DistributionRow = Record<string, string>;

export async function fetchDistributionSheet(): Promise<DistributionRow[]> {
  return [];
}

export function parseDistributionCsv(_csvText: string): DistributionRow[] {
  return [];
}
