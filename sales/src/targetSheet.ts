import { parseNumericCell } from'./utils';

export interface CategoryTarget {
 qty: number;
 amount: number;
}

export interface ShopTarget {
 shop: string;
 diamond: CategoryTarget;
 pt: CategoryTarget;
 gold15: CategoryTarget;
 gold16: CategoryTarget;
 total: CategoryTarget;
}

export interface TargetSheetData {
 month: string;
 total: Omit<ShopTarget,'shop'>;
 shops: Record<string, ShopTarget>;
}

const cleanValue = (value: string | undefined): string => {
 if (value == null) return'';
 return String(value).trim();
};

export const normalizeBranchName = (name: string): string => {
 return name
 .toLowerCase()
 .replace(/^29\s*/i,'')
 .replace(/\s+/g,'')
 .trim();
};

export const parseTargetSheetCsv = (csvText: string): TargetSheetData => {
 const lines = csvText
 .split(/\r?\n/)
 .map((line) => line.trim())
 .filter((line) => line.length > 0);

 if (lines.length < 3) {
 throw new Error('Target sheet does not contain enough rows');
 }

 // First row: category headers; second row: Qty/Amount sub-headers; remaining rows: data
 const dataRows = lines.slice(2);

 const shops: Record<string, ShopTarget> = {};
 let total: Omit<ShopTarget,'shop'> | null = null;

 dataRows.forEach((line) => {
 const cols = parseCsvLine(line);
 if (cols.length < 11) return;

 const shop = cleanValue(cols[0]);
 if (!shop) return;

 const entry: ShopTarget = {
 shop,
 diamond: { qty: parseNumericCell(cols[1]), amount: parseNumericCell(cols[2]) },
 pt: { qty: parseNumericCell(cols[3]), amount: parseNumericCell(cols[4]) },
 gold15: { qty: parseNumericCell(cols[5]), amount: parseNumericCell(cols[6]) },
 gold16: { qty: parseNumericCell(cols[7]), amount: parseNumericCell(cols[8]) },
 total: { qty: parseNumericCell(cols[9]), amount: parseNumericCell(cols[10]) },
 };

 if (shop.toLowerCase() ==='total') {
 total = {
 diamond: entry.diamond,
 pt: entry.pt,
 gold15: entry.gold15,
 gold16: entry.gold16,
 total: entry.total,
 };
 } else {
 shops[normalizeBranchName(shop)] = entry;
 // Also keep exact key for direct lookup
 if (shop !== normalizeBranchName(shop)) {
 shops[shop] = entry;
 }
 }
 });

 if (!total) {
 // If no explicit Total row, compute from shop entries
 total = {
 diamond: { qty: 0, amount: 0 },
 pt: { qty: 0, amount: 0 },
 gold15: { qty: 0, amount: 0 },
 gold16: { qty: 0, amount: 0 },
 total: { qty: 0, amount: 0 },
 };
 Object.values(shops).forEach((shop) => {
 total.diamond.qty += shop.diamond.qty;
 total.diamond.amount += shop.diamond.amount;
 total.pt.qty += shop.pt.qty;
 total.pt.amount += shop.pt.amount;
 total.gold15.qty += shop.gold15.qty;
 total.gold15.amount += shop.gold15.amount;
 total.gold16.qty += shop.gold16.qty;
 total.gold16.amount += shop.gold16.amount;
 total.total.qty += shop.total.qty;
 total.total.amount += shop.total.amount;
 });
 }

 return {
 month:'July',
 total,
 shops,
 };
};

// Simple CSV line parser that handles quoted fields containing commas
const parseCsvLine = (line: string): string[] => {
 const result: string[] = [];
 let current ='';
 let inQuotes = false;

 for (let i = 0; i < line.length; i++) {
 const char = line[i];
 const nextChar = line[i + 1];

 if (char ==='"') {
 if (inQuotes && nextChar ==='"') {
 current +='"';
 i++;
 } else {
 inQuotes = !inQuotes;
 }
 } else if (char ===',' && !inQuotes) {
 result.push(current);
 current ='';
 } else {
 current += char;
 }
 }

 result.push(current);
 return result;
};

export const findShopTarget = (
 targetData: TargetSheetData,
 branchName: string
): ShopTarget | undefined => {
 const exact = targetData.shops[branchName];
 if (exact) return exact;
 return targetData.shops[normalizeBranchName(branchName)];
};
