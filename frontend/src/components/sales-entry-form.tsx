'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import type { ApiResponse, RegionResponse, TownshipResponse } from '@/types';
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
import { ExternalLink, Loader2 } from 'lucide-react';
import { NrcPicker } from '@/components/nrc-picker';

type SalesBranchOption = {
  id: number;
  code: string;
  name: string;
  salesLabel: string;
};

export type SalesFormOptions = {
  itemMainGroups: string[];
  itemCategories: string[];
  purities: string[];
  reasons: string[];
  customerTypes: string[];
  newReturnOptions: string[];
  transactionTypes: string[];
  prefixes: string[];
  onOffOptions: string[];
  itemTypes: string[];
  keyAccountOptions: string[];
  salesStaffNames: string[];
};

/** Exact columns from form.csv (Google Form). */
export type SalesEntryFormState = {
  timestamp: string;
  saleDate: string;
  branchId: string;
  itemsCode: string;
  itemMainGroup: string;
  itemCategory: string;
  qty: string;
  diamondQty: string;
  stoneQty: string;
  totalWeight: string;
  stoneWeight: string;
  purity: string;
  goldPriceFee: string;
  k: string;
  p: string;
  y: string;
  gram: string;
  goldValue: string;
  kyat: string;
  roundKyattar: string;
  discountKyat: string;
  discountPae: string;
  discountYway: string;
  discountGram: string;
  discountValue: string;
  totalGoldValue: string;
  diamondStoneValue: string;
  laborOther: string;
  totalItemValue: string;
  voucherAmount: string;
  differentAmount: string;
  stamp: string;
  totalAmount: string;
  voucherNo: string;
  buyerName: string;
  buyerNrc: string | null;
  contactNumber: string;
  regionId: string;
  townshipId: string;
  customerType: string;
  newReturn: string;
  transactionType: string;
  prefix: string;
  staffId: string;
  salesStaff: string;
  onOff: string;
  changePercent: string;
  returnPercent: string;
  gsDate: string;
  itemType: string;
  reason: string;
  keyAccount: string;
  goldDensity: string;
  remark: string;
};

function nowTimestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function createEmptySalesEntry(): SalesEntryFormState {
  return {
    timestamp: nowTimestamp(),
    saleDate: new Date().toISOString().slice(0, 10),
    branchId: '',
    itemsCode: '',
    itemMainGroup: '',
    itemCategory: '',
    qty: '',
    diamondQty: '',
    stoneQty: '',
    totalWeight: '',
    stoneWeight: '',
    purity: '',
    goldPriceFee: '',
    k: '',
    p: '',
    y: '',
    gram: '',
    goldValue: '',
    kyat: '',
    roundKyattar: '',
    discountKyat: '',
    discountPae: '',
    discountYway: '',
    discountGram: '',
    discountValue: '',
    totalGoldValue: '',
    diamondStoneValue: '',
    laborOther: '',
    totalItemValue: '',
    voucherAmount: '',
    differentAmount: '',
    stamp: '',
    totalAmount: '',
    voucherNo: '',
    buyerName: '',
    buyerNrc: null,
    contactNumber: '',
    regionId: '',
    townshipId: '',
    customerType: 'New',
    newReturn: 'New',
    transactionType: 'Sale',
    prefix: '',
    staffId: '',
    salesStaff: '',
    onOff: 'ON',
    changePercent: '',
    returnPercent: '',
    gsDate: '',
    itemType: '',
    reason: 'G Sale',
    keyAccount: 'No',
    goldDensity: '',
    remark: '',
  };
}

function num(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(/,/g, ''));
  return Number.isNaN(n) ? null : n;
}

function FieldSelect({
  label,
  value,
  options,
  placeholder,
  required,
  onChange,
  allowEmpty,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  required?: boolean;
  onChange: (v: string) => void;
  allowEmpty?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label>
        {label}
        {required ? ' *' : ''}
      </Label>
      <Select
        value={allowEmpty ? value || '__none__' : value || undefined}
        onValueChange={(v) => onChange(allowEmpty && v === '__none__' ? '' : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder || 'ရွေးပါ'} />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value="__none__">—</SelectItem>}
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FieldNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" />
    </div>
  );
}

function FieldText({
  label,
  value,
  onChange,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label>
        {label}
        {required ? ' *' : ''}
      </Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border border-[#f0f0f0] bg-[#fafafa] p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[#595959]">{title}</h4>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

type SalesEntryFormProps = {
  onSaved: (message: string) => void;
  onError: (message: string) => void;
};

export function SalesEntryForm({ onSaved, onError }: SalesEntryFormProps) {
  const [form, setForm] = useState<SalesEntryFormState>(createEmptySalesEntry);
  const [branches, setBranches] = useState<SalesBranchOption[]>([]);
  const [regions, setRegions] = useState<RegionResponse[]>([]);
  const [townships, setTownships] = useState<TownshipResponse[]>([]);
  const [options, setOptions] = useState<SalesFormOptions | null>(null);
  const [creating, setCreating] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const set = <K extends keyof SalesEntryFormState>(key: K, value: SalesEntryFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const branchById = useMemo(
    () => new Map(branches.map((b) => [String(b.id), b])),
    [branches]
  );
  const selectedBranch = form.branchId ? branchById.get(form.branchId) : undefined;

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const [branchRes, regionRes, optionsRes] = await Promise.all([
        api.get<ApiResponse<SalesBranchOption[]>>('/sales/branches'),
        api.get<ApiResponse<RegionResponse[]>>('/locations/regions'),
        api.get<ApiResponse<SalesFormOptions>>('/sales/form-options'),
      ]);
      const branchList = branchRes.data.data ?? [];
      setBranches(branchList);
      setRegions(regionRes.data.data ?? []);
      setOptions(optionsRes.data.data);
      setForm((prev) => ({
        ...prev,
        branchId: prev.branchId || (branchList[0] ? String(branchList[0].id) : ''),
      }));
    } catch {
      onError('Form options မရရှိပါ');
    } finally {
      setLoadingMeta(false);
    }
  }, [onError]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const handleRegionChange = (regionId: string) => {
    set('regionId', regionId);
    set('townshipId', '');
    setTownships([]);
    if (!regionId) return;
    api
      .get<ApiResponse<TownshipResponse[]>>(`/locations/regions/${regionId}/townships`)
      .then(({ data }) => setTownships(data.data ?? []))
      .catch(() => onError('မြို့နယ် စာရင်း မရရှိပါ'));
  };

  async function saveRecord() {
    if (!selectedBranch) {
      onError('ဆိုင်ခွဲ ရွေးပေးပါ');
      return;
    }
    if (!form.saleDate || !form.reason) {
      onError('Date နှင့် အကြောင်းအရာ ထည့်ပါ');
      return;
    }

    const regionName = regions.find((r) => String(r.id) === form.regionId)?.nameMm || null;
    const townshipName = townships.find((t) => String(t.id) === form.townshipId)?.nameMm || null;
    const amountValue = num(form.totalAmount) ?? num(form.voucherAmount);
    const timestamp = form.timestamp || nowTimestamp();

    setCreating(true);
    try {
      const payload = {
        saleDate: form.saleDate,
        branchName: selectedBranch.salesLabel,
        reason: form.reason || null,
        salesStaff: form.salesStaff || null,
        buyerName: form.buyerName || null,
        buyerNrc: form.buyerNrc || null,
        contactNumber: form.contactNumber || null,
        township: townshipName,
        region: regionName,
        customerType: form.customerType || null,
        qty: num(form.qty),
        gram: num(form.gram),
        amount: amountValue,
        itemCategory: form.itemCategory || null,
        itemMainGroup: form.itemMainGroup || null,
        itemsCode: form.itemsCode || null,
        purity: form.purity || null,
        specialEvent: form.remark || null,
        formExtra: {
          Timestamp: timestamp,
          'စိန်ပွင့်ရေ': num(form.diamondQty),
          'ကျောက်ပွင့်ရေ': num(form.stoneQty),
          'စုစုပေါင်း အလေးချိန်': num(form.totalWeight),
          'ကျောက်ချိန်': num(form.stoneWeight),
          'ရွှေဈေးနူန်း': num(form.goldPriceFee),
          K: num(form.k),
          P: num(form.p),
          Y: num(form.y),
          'ရွှေတန်ဖိုး': num(form.goldValue),
          'ကျပ်သား': num(form.kyat),
          'Round Kyattar': num(form.roundKyattar),
          'အလျော့ ကျပ်': num(form.discountKyat),
          'အလျော့ ပဲ': num(form.discountPae),
          'အလျော့ ရွေး': num(form.discountYway),
          'အလျော့ ဂရမ်': num(form.discountGram),
          'အလျော့ တန်ဖိုး': num(form.discountValue),
          'ရွှေတန်ဖိုး စုစုပေါင်း (ရွှေချိန်+အလျော့)': num(form.totalGoldValue),
          'စိန်/ကျောတ် တန်ဖိုး': num(form.diamondStoneValue),
          'လက်ခ/အခြား': num(form.laborOther),
          'စုစုပေါင်း ပစ္စည်းတန်ဖိုး': num(form.totalItemValue),
          'Voucher Amount': num(form.voucherAmount),
          'Different Amount': num(form.differentAmount),
          Stamp: num(form.stamp),
          'Total Amount': num(form.totalAmount),
          'ပြေစာအမှတ်': form.voucherNo || null,
          'New /Return': form.newReturn || null,
          'Transcation Type': form.transactionType || null,
          Prefix: form.prefix || null,
          'Staff ID': form.staffId || null,
          'ON /OFF': form.onOff || null,
          'Change (%)': num(form.changePercent),
          'Return (%)': num(form.returnPercent),
          'GS Date': form.gsDate || null,
          'Item Type': form.itemType || null,
          'Key Account': form.keyAccount || null,
          'Gold Density': form.goldDensity || null,
        },
      };

      await api.post('/sales/transactions', payload);
      // Notify Sales SPA (CM View iframe) to reload from DB immediately
      try {
        const stamp = String(Date.now());
        localStorage.setItem('sales-data-updated-at', stamp);
        if (typeof BroadcastChannel !== 'undefined') {
          const channel = new BroadcastChannel('sales-data');
          channel.postMessage({ type: 'sales-data-updated', at: stamp });
          channel.close();
        }
      } catch {
        // ignore storage errors
      }
      onSaved('Sales record အသစ် ထည့်သွင်းပြီးပါပြီ။ CM View မှာ ချက်ချင်း ပြန်မြင်နိုင်ပါသည်။');
      setForm((prev) => ({
        ...createEmptySalesEntry(),
        branchId: prev.branchId,
        saleDate: prev.saleDate,
        reason: prev.reason,
        customerType: prev.customerType,
        newReturn: prev.newReturn,
        transactionType: prev.transactionType,
        onOff: prev.onOff,
        keyAccount: prev.keyAccount,
      }));
    } catch {
      onError('Sales record create မအောင်မြင်ပါ');
    } finally {
      setCreating(false);
    }
  }

  if (loadingMeta || !options) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#8c8c8c]" />
      </div>
    );
  }

  const staffOptions = Array.from(
    new Set([...(options.salesStaffNames || []), form.salesStaff].filter(Boolean))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[#262626]">Add new sales record</h3>
          <p className="mt-1 text-xs text-[#8c8c8c]">
            form.csv column အားလုံး — Save ပြီးရင် Database → CM View သို့ တိုက်ရိုက် ပေါ်ပါမည် (Google Sheet မသုံးပါ)။
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/sales/cm">
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            Open CM View
          </Link>
        </Button>
      </div>

      {/* form.csv order: Timestamp → Remark */}
      <Section title="1. Timestamp / Date / Branch">
        <FieldText
          label="Timestamp"
          value={form.timestamp}
          onChange={(v) => set('timestamp', v)}
          disabled
        />
        <div className="space-y-1">
          <Label>Date *</Label>
          <Input type="date" value={form.saleDate} onChange={(e) => set('saleDate', e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Branch အမည် *</Label>
          {branches.length <= 1 ? (
            <Input value={selectedBranch?.salesLabel || ''} disabled />
          ) : (
            <Select value={form.branchId || undefined} onValueChange={(v) => set('branchId', v)}>
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
      </Section>

      <Section title="2. Item">
        <FieldText label="Items Code" value={form.itemsCode} onChange={(v) => set('itemsCode', v)} />
        <FieldSelect
          label="Item Main Group"
          value={form.itemMainGroup}
          options={options.itemMainGroups}
          allowEmpty
          onChange={(v) => set('itemMainGroup', v)}
        />
        <FieldSelect
          label="Item Category"
          value={form.itemCategory}
          options={options.itemCategories}
          allowEmpty
          onChange={(v) => set('itemCategory', v)}
        />
        <FieldNumber label="Qty" value={form.qty} onChange={(v) => set('qty', v)} />
        <FieldNumber label="စိန်ပွင့်ရေ" value={form.diamondQty} onChange={(v) => set('diamondQty', v)} />
        <FieldNumber label="ကျောက်ပွင့်ရေ" value={form.stoneQty} onChange={(v) => set('stoneQty', v)} />
      </Section>

      <Section title="3. Weight / ပဲရည် / KPY">
        <FieldNumber label="စုစုပေါင်း အလေးချိန်" value={form.totalWeight} onChange={(v) => set('totalWeight', v)} />
        <FieldNumber label="ကျောက်ချိန်" value={form.stoneWeight} onChange={(v) => set('stoneWeight', v)} />
        <FieldSelect
          label="ပဲရည်"
          value={form.purity}
          options={options.purities}
          allowEmpty
          onChange={(v) => set('purity', v)}
        />
        <FieldNumber label="ရွှေဈေးနူန်း" value={form.goldPriceFee} onChange={(v) => set('goldPriceFee', v)} />
        <FieldNumber label="K" value={form.k} onChange={(v) => set('k', v)} />
        <FieldNumber label="P" value={form.p} onChange={(v) => set('p', v)} />
        <FieldNumber label="Y" value={form.y} onChange={(v) => set('y', v)} />
        <FieldNumber label="Gram" value={form.gram} onChange={(v) => set('gram', v)} />
      </Section>

      <Section title="4. Gold value / အလျော့">
        <FieldNumber label="ရွှေတန်ဖိုး" value={form.goldValue} onChange={(v) => set('goldValue', v)} />
        <FieldNumber label="ကျပ်သား" value={form.kyat} onChange={(v) => set('kyat', v)} />
        <FieldNumber label="Round Kyattar" value={form.roundKyattar} onChange={(v) => set('roundKyattar', v)} />
        <FieldNumber label="အလျော့ ကျပ်" value={form.discountKyat} onChange={(v) => set('discountKyat', v)} />
        <FieldNumber label="အလျော့ ပဲ" value={form.discountPae} onChange={(v) => set('discountPae', v)} />
        <FieldNumber label="အလျော့ ရွေး" value={form.discountYway} onChange={(v) => set('discountYway', v)} />
        <FieldNumber label="အလျော့ ဂရမ်" value={form.discountGram} onChange={(v) => set('discountGram', v)} />
        <FieldNumber label="အလျော့ တန်ဖိုး" value={form.discountValue} onChange={(v) => set('discountValue', v)} />
        <FieldNumber
          label="ရွှေတန်ဖိုး စုစုပေါင်း (ရွှေချိန်+အလျော့)"
          value={form.totalGoldValue}
          onChange={(v) => set('totalGoldValue', v)}
        />
        <FieldNumber label="စိန်/ကျောတ် တန်ဖိုး" value={form.diamondStoneValue} onChange={(v) => set('diamondStoneValue', v)} />
        <FieldNumber label="လက်ခ/အခြား" value={form.laborOther} onChange={(v) => set('laborOther', v)} />
        <FieldNumber label="စုစုပေါင်း ပစ္စည်းတန်ဖိုး" value={form.totalItemValue} onChange={(v) => set('totalItemValue', v)} />
      </Section>

      <Section title="5. Voucher / Amount">
        <FieldNumber label="Voucher Amount" value={form.voucherAmount} onChange={(v) => set('voucherAmount', v)} />
        <FieldNumber label="Different Amount" value={form.differentAmount} onChange={(v) => set('differentAmount', v)} />
        <FieldNumber label="Stamp" value={form.stamp} onChange={(v) => set('stamp', v)} />
        <FieldNumber label="Total Amount" value={form.totalAmount} onChange={(v) => set('totalAmount', v)} />
        <FieldText label="ပြေစာအမှတ်" value={form.voucherNo} onChange={(v) => set('voucherNo', v)} />
      </Section>

      <Section title="6. Customer / Location / NRC">
        <FieldText label="ဝယ်သူ အမည်" value={form.buyerName} onChange={(v) => set('buyerName', v)} />
        <div className="space-y-1 md:col-span-2 lg:col-span-3">
          <Label>မှတ်ပုံတင်အမှတ်</Label>
          <NrcPicker value={form.buyerNrc} onChange={(nrc) => set('buyerNrc', nrc)} />
        </div>
        <FieldText label="Contact Number" value={form.contactNumber} onChange={(v) => set('contactNumber', v)} />
        <div className="space-y-1">
          <Label>Region</Label>
          <Select value={form.regionId || undefined} onValueChange={handleRegionChange}>
            <SelectTrigger>
              <SelectValue placeholder="ပြည်နယ် / တိုင်း ရွေးပါ" />
            </SelectTrigger>
            <SelectContent>
              {regions.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.nameMm}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Township</Label>
          <Select
            value={form.townshipId || undefined}
            onValueChange={(v) => set('townshipId', v)}
            disabled={!form.regionId}
          >
            <SelectTrigger>
              <SelectValue placeholder="မြို့နယ် ရွေးပါ" />
            </SelectTrigger>
            <SelectContent>
              {townships.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.nameMm}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <FieldSelect
          label="Type"
          value={form.customerType}
          options={options.customerTypes}
          onChange={(v) => set('customerType', v)}
        />
        <FieldSelect
          label="New /Return"
          value={form.newReturn}
          options={options.newReturnOptions}
          onChange={(v) => set('newReturn', v)}
        />
        <FieldSelect
          label="Transcation Type"
          value={form.transactionType}
          options={options.transactionTypes}
          onChange={(v) => set('transactionType', v)}
        />
        <FieldSelect
          label="Prefix"
          value={form.prefix}
          options={options.prefixes}
          allowEmpty
          onChange={(v) => set('prefix', v)}
        />
      </Section>

      <Section title="7. Staff / Status / Reason">
        <FieldText label="Staff ID" value={form.staffId} onChange={(v) => set('staffId', v)} />
        <FieldSelect
          label="အရောင်းသမားအမည်"
          value={form.salesStaff}
          options={staffOptions}
          allowEmpty
          onChange={(v) => set('salesStaff', v)}
        />
        <FieldSelect
          label="ON /OFF"
          value={form.onOff}
          options={options.onOffOptions}
          onChange={(v) => set('onOff', v)}
        />
        <FieldNumber label="Change (%)" value={form.changePercent} onChange={(v) => set('changePercent', v)} />
        <FieldNumber label="Return (%)" value={form.returnPercent} onChange={(v) => set('returnPercent', v)} />
        <div className="space-y-1">
          <Label>GS Date</Label>
          <Input type="date" value={form.gsDate} onChange={(e) => set('gsDate', e.target.value)} />
        </div>
        <FieldSelect
          label="Item Type"
          value={form.itemType}
          options={options.itemTypes}
          allowEmpty
          onChange={(v) => set('itemType', v)}
        />
        <FieldSelect
          label="အကြောင်းအရာ"
          value={form.reason}
          options={options.reasons}
          required
          onChange={(v) => set('reason', v)}
        />
        <FieldSelect
          label="Key Account"
          value={form.keyAccount}
          options={options.keyAccountOptions}
          onChange={(v) => set('keyAccount', v)}
        />
        <FieldText label="Gold Density" value={form.goldDensity} onChange={(v) => set('goldDensity', v)} />
        <FieldText label="Remark" value={form.remark} onChange={(v) => set('remark', v)} />
      </Section>

      <Button
        onClick={() => void saveRecord()}
        disabled={creating || !form.saleDate || !form.branchId || !form.reason}
      >
        {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save record
      </Button>
    </div>
  );
}
