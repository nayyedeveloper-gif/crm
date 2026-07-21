import Papa from'papaparse';
import { parseSafeDate } from'./utils';

export interface DistributionRecord {
 itemCategory: string;
 totalQty: number;
 branch: string;
 month: string;
}

export interface DistributionData {
 records: DistributionRecord[];
 byCategory: Record<string, number>;
}

export const DISTRIBUTION_SHEET_URL ='https://docs.google.com/spreadsheets/d/1uNiuuHjdtXFdEUbyrTs2UV6dET9zVBrErtSt3qu3lnw/export?format=csv&gid=0';

const cleanValue = (value: string | undefined): string => {
 if (value == null) return'';
 return value.trim().replace(/\r/g,'');
};

export const getDistQtyForCategory = (
 distData: DistributionData,
 mainGroupName: string,
 branchFilter?: string | null,
 monthFilter?: string | null
): number => {
 const name = mainGroupName.trim();
 if (!name) return 0;

 if (!branchFilter && !monthFilter) {
 return distData.byCategory[name] || 0;
 }

 return distData.records
 .filter((r) => {
 if (r.itemCategory !== name) return false;
 if (branchFilter && r.branch !== branchFilter) return false;
 if (monthFilter && r.month !== monthFilter) return false;
 return true;
 })
 .reduce((sum, r) => sum + r.totalQty, 0);
};

export const parseDistributionCsv = (csvText: string): DistributionData => {
 const result = Papa.parse<string[]>(csvText, {
 header: false,
 skipEmptyLines: true,
 });

 const rows = result.data as string[][];
 if (rows.length < 2) return { records: [], byCategory: {} };

 const headerCols = rows[0].map(cleanValue);
 const reasonIdx = headerCols.findIndex((h) => h.toLowerCase() ==='reason');
 const mainItemsGroupIdx = headerCols.findIndex((h) => h.toLowerCase().replace(/\s+/g,'') ==='main items group');
 const totalQtyIdx = headerCols.findIndex((h) => h.toLowerCase().replace(/\s+/g,'') ==='total qty');
 const branchIdx = headerCols.findIndex((h) => h.toLowerCase().replace(/\s+/g,'') ==='transfer branch');
 const dateIdx = headerCols.findIndex((h) => h.toLowerCase().replace(/\s+/g,'') ==='transfer date');

 if (reasonIdx === -1 || mainItemsGroupIdx === -1 || totalQtyIdx === -1) {
 return { records: [], byCategory: {} };
 }

 const records: DistributionRecord[] = [];
 const byCategory: Record<string, number> = {};

 for (let i = 1; i < rows.length; i++) {
 const cols = rows[i];
 if (cols.length < Math.max(reasonIdx, mainItemsGroupIdx, totalQtyIdx) + 1) continue;

 const reason = cleanValue(cols[reasonIdx]);
 if (reason !=='Distribution to Branch') continue;

 const itemCategory = cleanValue(cols[mainItemsGroupIdx]);
 if (!itemCategory) continue;

 const totalQty = parseInt(cleanValue(cols[totalQtyIdx]).replace(/,/g,''), 10) || 0;
 const branch = branchIdx >= 0 ? cleanValue(cols[branchIdx]) :'';
 const dateStr = dateIdx >= 0 ? cleanValue(cols[dateIdx]) :'';
 const date = parseSafeDate(dateStr);
 const month = date ? date.toLocaleDateString('en-US', { month:'long' }) :'';

 records.push({ itemCategory, totalQty, branch, month });

 byCategory[itemCategory] = (byCategory[itemCategory] || 0) + totalQty;
 }

 return { records, byCategory };
};
