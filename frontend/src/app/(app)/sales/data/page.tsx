'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { CRM_PERMISSION_KEYS, usePermissionStore } from '@/lib/permission-store';
import type { ApiResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

type SalesStatus = {
  transactionCount: number;
  latestSaleDate: string | null;
  lastUpdated: string | null;
};

type ImportResult = {
  imported: number;
  skipped: number;
  message: string;
};

type SalesBranchOption = {
  id: number;
  code: string;
  name: string;
  salesLabel: string;
};

type SalesCreateRequest = {
  branchId: string;
  saleDate: string;
  reason: string;
  salesStaff: string;
  buyerName: string;
  contactNumber: string;
  township: string;
  region: string;
  customerType: string;
  qty: string;
  gram: string;
  amount: string;
  itemCategory: string;
  itemMainGroup: string;
  itemsCode: string;
  purity: string;
  specialEvent: string;
};

const SALE_REASONS = ['G Sale', 'Dia Sale', 'PT Sale', 'Sale', 'G RC', 'Dia RC', 'PT RC', 'G RP', 'Dia RP', 'PT RP'];

export default function SalesDataPage() {
  const canSales = usePermissionStore((s) => s.can(CRM_PERMISSION_KEYS.sales));
  const canImport = usePermissionStore((s) => s.can('SALES_IMPORT'));
  const [status, setStatus] = useState<SalesStatus | null>(null);
  const [branches, setBranches] = useState<SalesBranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingTx, setImportingTx] = useState(false);
  const [importingTargets, setImportingTargets] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [targetMonth, setTargetMonth] = useState(
    () => new Date().toLocaleString('en-US', { month: 'long' })
  );
  const [creating, setCreating] = useState(false);
  const [record, setRecord] = useState<SalesCreateRequest>({
    branchId: '',
    saleDate: new Date().toISOString().slice(0, 10),
    reason: 'G Sale',
    salesStaff: '',
    buyerName: '',
    contactNumber: '',
    township: '',
    region: '',
    customerType: 'New',
    qty: '',
    gram: '',
    amount: '',
    itemCategory: '',
    itemMainGroup: '',
    itemsCode: '',
    purity: '',
    specialEvent: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const branchById = useMemo(
    () => new Map(branches.map((b) => [String(b.id), b])),
    [branches]
  );

  const selectedBranch = record.branchId ? branchById.get(record.branchId) : undefined;

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<ApiResponse<SalesStatus>>('/sales/status');
      setStatus(data.data);
    } catch {
      setError('Sales status ကို မဖတ်နိုင်ပါ');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBranches = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<SalesBranchOption[]>>('/sales/branches');
      const list = data.data ?? [];
      setBranches(list);
      setRecord((prev) => ({
        ...prev,
        branchId: prev.branchId || (list[0] ? String(list[0].id) : ''),
      }));
    } catch {
      setError('ဆိုင်စာရင်း မရရှိပါ');
    }
  }, []);

  useEffect(() => {
    if (!canSales) {
      setLoading(false);
      return;
    }
    void loadStatus();
    void loadBranches();
  }, [canSales, loadStatus, loadBranches]);

  async function importTransactions(file: File) {
    setImportingTx(true);
    setMessage('');
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<ApiResponse<ImportResult>>(
        '/sales/import/transactions?replaceAll=true',
        form
      );
      setMessage(data.message || data.data.message);
      await loadStatus();
    } catch {
      setError('Transactions CSV import မအောင်မြင်ပါ');
    } finally {
      setImportingTx(false);
    }
  }

  async function importTargets(file: File) {
    setImportingTargets(true);
    setMessage('');
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<ApiResponse<ImportResult>>(
        `/sales/import/targets?month=${encodeURIComponent(targetMonth)}&replaceMonth=true`,
        form
      );
      setMessage(data.message || data.data.message);
    } catch {
      setError('Targets CSV import မအောင်မြင်ပါ');
    } finally {
      setImportingTargets(false);
    }
  }

  async function exportTransactions() {
    setExporting(true);
    setMessage('');
    setError('');
    try {
      const res = await api.get('/sales/export/transactions', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `sales-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      setMessage('CSV export အောင်မြင်ပါသည်');
    } catch {
      setError('CSV export မအောင်မြင်ပါ');
    } finally {
      setExporting(false);
    }
  }

  async function createRecord() {
    if (!selectedBranch) {
      setError('ဆိုင်ခွဲ ရွေးပေးပါ');
      return;
    }

    setCreating(true);
    setMessage('');
    setError('');
    try {
      const payload = {
        saleDate: record.saleDate || null,
        branchName: selectedBranch.salesLabel,
        reason: record.reason || null,
        salesStaff: record.salesStaff || null,
        buyerName: record.buyerName || null,
        contactNumber: record.contactNumber || null,
        township: record.township || null,
        region: record.region || null,
        customerType: record.customerType || null,
        qty: record.qty ? Number(record.qty) : null,
        gram: record.gram ? Number(record.gram) : null,
        amount: record.amount ? Number(record.amount) : null,
        itemCategory: record.itemCategory || null,
        itemMainGroup: record.itemMainGroup || null,
        itemsCode: record.itemsCode || null,
        purity: record.purity || null,
        specialEvent: record.specialEvent || null,
      };
      await api.post('/sales/transactions', payload);
      setMessage('Sales record အသစ် ထည့်သွင်းပြီးပါပြီ။ CM View မှာ ပြန်ကြည့်နိုင်ပါသည်။');
      await loadStatus();
      setRecord((prev) => ({
        ...prev,
        qty: '',
        gram: '',
        amount: '',
        buyerName: '',
        contactNumber: '',
      }));
    } catch {
      setError('Sales record create မအောင်မြင်ပါ');
    } finally {
      setCreating(false);
    }
  }

  if (!canSales) {
    return (
      <div className="p-6">
        <p className="text-sm text-[#8c8c8c]">Sales Data ကို ကြည့်ရန် SALES_VIEW permission လိုအပ်ပါသည်။</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div>
        <h2 className="text-lg font-semibold text-[#262626]">Sales Data</h2>
        <p className="mt-1 text-sm text-[#8c8c8c]">
          Google Sheet အစား database ထဲသို့ record ထည့်ခြင်း၊ CSV import/export လုပ်ပါ။
        </p>
      </div>

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#262626]">Current status</h3>
          <Button variant="outline" size="sm" onClick={loadStatus} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
        {status ? (
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[#8c8c8c]">Transactions</dt>
              <dd className="font-semibold">{status.transactionCount.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-[#8c8c8c]">Latest sale date</dt>
              <dd className="font-semibold">{status.latestSaleDate || '—'}</dd>
            </div>
            <div>
              <dt className="text-[#8c8c8c]">Last updated</dt>
              <dd className="font-semibold">
                {status.lastUpdated ? formatDateTime(status.lastUpdated) : '—'}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-[#8c8c8c]">—</p>
        )}
      </div>

      <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[#262626]">Add new sales record</h3>
            <p className="mt-1 text-xs text-[#8c8c8c]">
              Google Form အစား record အသစ်ကို Database ထဲ တိုက်ရိုက်ထည့်ပါ။ Save ပြီးရင် CM View မှာ ပြန်မြင်နိုင်ပါသည်။
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/sales/cm">
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Open CM View
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Date *</Label>
            <Input
              type="date"
              value={record.saleDate}
              onChange={(e) => setRecord((p) => ({ ...p, saleDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Branch *</Label>
            {branches.length <= 1 ? (
              <Input value={selectedBranch?.salesLabel || ''} disabled />
            ) : (
              <Select
                value={record.branchId || undefined}
                onValueChange={(v) => setRecord((p) => ({ ...p, branchId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ဆိုင်ရွေးပါ" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.salesLabel}
                      {b.name && b.name !== b.salesLabel ? ` (${b.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1">
            <Label>Reason *</Label>
            <Select
              value={record.reason}
              onValueChange={(v) => setRecord((p) => ({ ...p, reason: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Reason ရွေးပါ" />
              </SelectTrigger>
              <SelectContent>
                {SALE_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Amount</Label>
            <Input
              type="number"
              value={record.amount}
              onChange={(e) => setRecord((p) => ({ ...p, amount: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label>Qty</Label>
            <Input
              type="number"
              value={record.qty}
              onChange={(e) => setRecord((p) => ({ ...p, qty: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label>Gram</Label>
            <Input
              type="number"
              value={record.gram}
              onChange={(e) => setRecord((p) => ({ ...p, gram: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label>Items Code</Label>
            <Input
              value={record.itemsCode}
              onChange={(e) => setRecord((p) => ({ ...p, itemsCode: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Item Main Group</Label>
            <Input
              value={record.itemMainGroup}
              onChange={(e) => setRecord((p) => ({ ...p, itemMainGroup: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Item Category</Label>
            <Input
              value={record.itemCategory}
              onChange={(e) => setRecord((p) => ({ ...p, itemCategory: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Sales Staff</Label>
            <Input
              value={record.salesStaff}
              onChange={(e) => setRecord((p) => ({ ...p, salesStaff: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Buyer Name</Label>
            <Input
              value={record.buyerName}
              onChange={(e) => setRecord((p) => ({ ...p, buyerName: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Contact</Label>
            <Input
              value={record.contactNumber}
              onChange={(e) => setRecord((p) => ({ ...p, contactNumber: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Region</Label>
            <Input
              value={record.region}
              onChange={(e) => setRecord((p) => ({ ...p, region: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Township</Label>
            <Input
              value={record.township}
              onChange={(e) => setRecord((p) => ({ ...p, township: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Purity</Label>
            <Input
              value={record.purity}
              onChange={(e) => setRecord((p) => ({ ...p, purity: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Remark</Label>
            <Input
              value={record.specialEvent}
              onChange={(e) => setRecord((p) => ({ ...p, specialEvent: e.target.value }))}
            />
          </div>
        </div>
        <Button
          onClick={createRecord}
          disabled={creating || !record.saleDate || !record.branchId || !record.reason}
        >
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save record
        </Button>
      </div>

      {canImport && (
        <>
          <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 space-y-4">
            <h3 className="text-sm font-semibold text-[#262626]">Export</h3>
            <p className="text-xs text-[#8c8c8c]">
              Database ထဲရှိ sales transactions အားလုံးကို CSV အဖြစ် download လုပ်ပါ။
            </p>
            <Button onClick={exportTransactions} disabled={exporting}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export transactions CSV
            </Button>
          </div>

          <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 space-y-4">
            <h3 className="text-sm font-semibold text-[#262626]">Import transactions</h3>
            <p className="text-xs text-[#8c8c8c]">
              Main sales sheet CSV — import လုပ်ပါက အဟောင်းအားလုံးကို အစားထိုးမည်။
            </p>
            <Input
              type="file"
              accept=".csv,text/csv"
              disabled={importingTx}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importTransactions(file);
                e.target.value = '';
              }}
            />
            {importingTx && (
              <p className="text-xs text-primary flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing…
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[#e8e8e8] bg-white p-4 space-y-4">
            <h3 className="text-sm font-semibold text-[#262626]">Import monthly targets</h3>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="target-month">Month label</Label>
              <Input
                id="target-month"
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                placeholder="July"
              />
            </div>
            <Input
              type="file"
              accept=".csv,text/csv"
              disabled={importingTargets}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importTargets(file);
                e.target.value = '';
              }}
            />
            {importingTargets && (
              <p className="text-xs text-primary flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing targets…
              </p>
            )}
          </div>
        </>
      )}

      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
