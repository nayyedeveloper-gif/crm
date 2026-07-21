import { DataRow } from'./types';

export const getBranchLocation = (branchName: string) => {
 if (branchName.includes('Shop 1')) return'တာမွေမြို့နယ်၊ ရန်ကုန်မြို့။';
 if (branchName.includes('Shop 2')) return'တာမွေမြို့နယ်၊ရန်ကုန်မြို့။';
 if (branchName.includes('Shop 3')) return'လသာမြို့နယ်၊ ရန်ကုန်မြို့။';
 if (branchName.includes('Shop 4')) return'လှိုင်သာယာမြို့နယ်၊ ရန်ကုန်မြို့။';
 if (branchName.includes('Shop 5')) return'သင်္ဃန်းကျွန်းမြို့နယ် ၊ ရန်ကုန်မြို့ ။';
 if (branchName.includes('Shop 6')) return'မန္တလေးမြို့';
 return'Branch Location';
};

export const branchFilterShowsAll = (selectedBranches: string[]) =>
 selectedBranches.length === 0 || selectedBranches.includes('All');

export const filterRowsByBranches = (rows: DataRow[], selectedBranches: string[]) => {
 if (branchFilterShowsAll(selectedBranches)) return rows;
 const allowed = new Set(selectedBranches);
 return rows.filter((row) => allowed.has(row['Branch အမည်']));
};

export const getExtractedReason = (row: any) => {
 const reason = row['အကြောင်းအရာ'];
 return reason ||'Other';
};

export const parseNumericCell = (value: string | number | undefined | null): number => {
 if (value == null || value ==='') return 0;
 if (typeof value ==='number') return isNaN(value) ? 0 : value;

 let s = String(value).trim().replace(/\s/g,'');
 if (!s) return 0;

 const hasComma = s.includes(',');
 const hasDot = s.includes('.');
 if (hasComma && hasDot) {
 const lastComma = s.lastIndexOf(',');
 const lastDot = s.lastIndexOf('.');
 s = lastComma > lastDot ? s.replace(/\./g,'').replace(',','.') : s.replace(/,/g,'');
 } else if (hasComma) {
 const parts = s.split(',');
 s = parts.length === 2 && parts[1].length <= 2 ? `${parts[0]}.${parts[1]}` : s.replace(/,/g,'');
 }

 const n = parseFloat(s);
 return isNaN(n) ? 0 : n;
};

export const formatGramValue = (gram: number): string => {
 if (!gram) return'-';
 return Number(gram.toFixed(2)).toString();
};

export type KpyWeight = { k: number; p: number; y: number };

/** 1 Kyatthar (K) = 16.329 Gram (G) */
export const GRAMS_PER_KYATTHAR = 16.329;

/** Gram (G) → K (ကျပ်), P (ပဲ), Y (ရွေး): 1K = 16.329G, 1K = 16P, 1P = 8Y */
export const gramToKpy = (gram: number): KpyWeight => {
 if (!gram) return { k: 0, p: 0, y: 0 };

 const kyatthar = Math.abs(gram) / GRAMS_PER_KYATTHAR;
 let k = Math.floor(kyatthar);
 const remainder = kyatthar - k;
 let totalPae = remainder * 16;
 let p = Math.floor(totalPae + 1e-9);
 let y = Math.round((totalPae - p) * 8);

 if (y >= 8) {
 p += 1;
 y = 0;
 }
 if (p >= 16) {
 k += Math.floor(p / 16);
 p = p % 16;
 }

 return { k, p, y };
};

export const formatGramToKPY = (gram: number): string => {
 if (!gram) return'-';
 const { k, p, y } = gramToKpy(gram);
 return `${k}K ${p}P ${y}Y`;
};

export const parseSafeDate = (dateStr: string | undefined): Date | null => {
 if (!dateStr) return null;
 
 // Clean the string
 const cleanStr = dateStr.trim();
 if (!cleanStr) return null;

 // 1. Handle DD.MM.YYYY (Common in Myanmar)
 const dotParts = cleanStr.split('.');
 if (dotParts.length === 3) {
 const d = parseInt(dotParts[0]);
 const m = parseInt(dotParts[1]);
 const y = parseInt(dotParts[2]);
 if (y > 1000 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
 return new Date(y, m - 1, d);
 }
 }

 // 2. Try standard parsing
 // This handles M/D/YYYY (standard Google Sheets export) and YYYY-MM-DD
 const date = new Date(cleanStr);
 
 if (!isNaN(date.getTime()) && date.getFullYear() > 2000 && date.getFullYear() < 2100) {
 // Check for DD/MM/YYYY where DD > 12 which might fail standard parsing or be misinterpreted
 const parts = cleanStr.split(/[\/\-]/);
 if (parts.length === 3) {
 const p1 = parseInt(parts[0]);
 const p2 = parseInt(parts[1]);
 const p3 = parseInt(parts[2]);
 
 // If p1 > 12 and p3 > 1000, it's definitely DD/MM/YYYY
 if (p1 > 12 && p3 > 1000) {
 return new Date(p3, p2 - 1, p1);
 }
 }
 return date;
 }

 // 3. Manual fallback for DD/MM/YYYY where DD > 12 and standard parsing failed
 const parts = cleanStr.split(/[\/\-\s]/);
 if (parts.length >= 3) {
 const p1 = parseInt(parts[0]);
 const p2 = parseInt(parts[1]);
 const p3 = parseInt(parts[2]);

 if (p3 > 1000 && p1 > 12 && p1 <= 31 && p2 >= 1 && p2 <= 12) {
 return new Date(p3, p2 - 1, p1);
 }
 
 if (p1 > 1000 && p2 >= 1 && p2 <= 12 && p3 >= 1 && p3 <= 31) {
 return new Date(p1, p2 - 1, p3);
 }
 }

 return null;
};

export const apiFetch = (input: RequestInfo | URL, init?: RequestInit) => {
 const headers = new Headers(init?.headers);
 if (typeof window !== 'undefined') {
 const token = localStorage.getItem('accessToken');
 if (token && !headers.has('Authorization')) {
 headers.set('Authorization', `Bearer ${token}`);
 }
 }
 return fetch(input, { ...init, headers });
};
