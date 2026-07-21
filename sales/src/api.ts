import type { TargetSheetData } from './targetSheet';

const API_BASE = '/api';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
}

async function parseApi<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || body.success === false) {
    throw new Error(body.message || `Request failed (${response.status})`);
  }
  return body.data;
}

export async function fetchSalesTransactions(): Promise<Record<string, unknown>[]> {
  const response = await fetch(`${API_BASE}/sales/transactions`, {
    headers: authHeaders(),
  });
  return parseApi(response);
}
 
export async function fetchSalesTransactionsByRange(params: {
  from?: string;
  to?: string;
}): Promise<Record<string, unknown>[]> {
  const query = new URLSearchParams();
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const response = await fetch(`${API_BASE}/sales/transactions${suffix}`, {
    headers: authHeaders(),
  });
  return parseApi(response);
}

export async function fetchSalesTargets(month?: string): Promise<TargetSheetData> {
  const query = month ? `?month=${encodeURIComponent(month)}` : '';
  const response = await fetch(`${API_BASE}/sales/targets${query}`, {
    headers: authHeaders(),
  });
  const data = await parseApi<{
    month: string;
    total: TargetSheetData['total'];
    shops: TargetSheetData['shops'];
  }>(response);
  return {
    month: data.month,
    total: data.total,
    shops: data.shops,
  };
}

export async function fetchSalesStatus(): Promise<{
  transactionCount: number;
  latestSaleDate: string | null;
  lastUpdated: string | null;
}> {
  const response = await fetch(`${API_BASE}/sales/status`, {
    headers: authHeaders(),
  });
  return parseApi(response);
}

export function hasCrmAccessToken(): boolean {
  return typeof window !== 'undefined' && !!localStorage.getItem('accessToken');
}
