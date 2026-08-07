'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import type {
  ApiResponse,
  CrmHistoryResponse,
  CrmHistoryRequest,
  RegionResponse,
  TownshipResponse,
  ActionType,
  InviteStatus,
  BranchResponse,
} from '@/types';
import { ACTION_TYPE_LABELS, INVITE_STATUS_LABELS } from '@/types';
import { useAuthStore } from '@/lib/auth-store';
import { CRM_PERMISSION_KEYS, usePermissionStore } from '@/lib/permission-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { NrcPicker } from '@/components/nrc-picker';

const ACTION_TYPES: ActionType[] = ['PURCHASE', 'INQUIRY', 'FOLLOW_UP', 'COMPLAINT', 'OTHER'];
const INVITE_STATUSES: InviteStatus[] = [
  'ATTEND',
  'NOT_ATTEND',
  'UNREACHABLE',
  'NOT_ANSWERED',
  'PHONE_OFF',
];

/** Same presets as Laravel CRM amount_range (သိန်း buckets → MMK seed value). */
const AMOUNT_RANGES: { value: string; label: string }[] = [
  { value: '5000000', label: '50 - 100 (5,000,000 ~ 10,000,000 MMK)' },
  { value: '10000000', label: '100 - 300 (10,000,000 ~ 30,000,000 MMK)' },
  { value: '30000000', label: '300 - 500 (30,000,000 ~ 50,000,000 MMK)' },
  { value: '50000000', label: '500 - 1000 (50,000,000 ~ 100,000,000 MMK)' },
  { value: '100000000', label: '1000 အထက် (100,000,000 MMK ~)' },
  { value: '100000', label: '50 အောက် (100,000 ~ 5,000,000 MMK)' },
];

function inviteToAction(invite: InviteStatus | null): ActionType {
  switch (invite) {
    case 'ATTEND':
      return 'PURCHASE';
    case 'NOT_ATTEND':
      return 'FOLLOW_UP';
    case 'UNREACHABLE':
    case 'NOT_ANSWERED':
    case 'PHONE_OFF':
      return 'INQUIRY';
    default:
      return 'OTHER';
  }
}

interface CrmHistoryFormProps {
  recordId?: string;
}

export function CrmHistoryForm({ recordId }: CrmHistoryFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = !!recordId;
  const { user } = useAuthStore();
  const canBranchAll = usePermissionStore((s) => s.can(CRM_PERMISSION_KEYS.branchAll));
  const canCreate = usePermissionStore((s) => s.canEditCrm());

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [regions, setRegions] = useState<RegionResponse[]>([]);
  const [townships, setTownships] = useState<TownshipResponse[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [amountInput, setAmountInput] = useState('');
  const [amountRange, setAmountRange] = useState('');

  const [form, setForm] = useState<Omit<CrmHistoryRequest, 'amount'> & { amount?: number | null }>({
    branchId: null,
    customerName: '',
    phone: '',
    birthday: null,
    actionType: 'PURCHASE',
    inviteStatus: null,
    customerCondition: null,
    regionId: null,
    townshipId: null,
    nrc: null,
    address: '',
    remark: '',
  });

  useEffect(() => {
    api
      .get<ApiResponse<RegionResponse[]>>('/locations/regions')
      .then(({ data }) => setRegions(data.data ?? []))
      .catch(() => setError('ပြည်နယ် / တိုင်း စာရင်း မရရှိပါ'));
    if (canBranchAll) {
      api
        .get<ApiResponse<BranchResponse[]>>('/branches')
        .then(({ data }) => setBranches(data.data ?? []))
        .catch(() => setError('ဆိုင်စာရင်း မရရှိပါ'));
    } else if (user?.branchId) {
      setForm((prev) => ({ ...prev, branchId: user.branchId }));
    }
  }, [user, canBranchAll]);

  useEffect(() => {
    if (isEdit) return;
    const phone = searchParams.get('phone');
    const customerName = searchParams.get('customerName');
    if (!phone && !customerName) return;
    setForm((prev) => ({
      ...prev,
      phone: phone || prev.phone,
      customerName: customerName || prev.customerName,
    }));
  }, [isEdit, searchParams]);

  useEffect(() => {
    if (!isEdit || !recordId) return;
    api.get<ApiResponse<CrmHistoryResponse>>(`/crm-history/${recordId}`).then(({ data }) => {
      const d = data.data;
      setForm({
        branchId: d.branchId,
        customerName: d.customerName,
        phone: d.phone,
        birthday: d.birthday,
        actionType: d.actionType,
        inviteStatus: d.inviteStatus,
        customerCondition: d.customerCondition,
        regionId: d.regionId,
        townshipId: d.townshipId,
        nrc: d.nrc,
        address: d.address || '',
        remark: d.remark || '',
      });
      setAmountInput(d.amount != null && Number(d.amount) !== 0 ? String(d.amount) : '');
      if (d.regionId) {
        api
          .get<ApiResponse<TownshipResponse[]>>(`/locations/regions/${d.regionId}/townships`)
          .then(({ data: td }) => setTownships(td.data));
      }
      setLoading(false);
    });
  }, [isEdit, recordId]);

  const handleRegionChange = (value: string) => {
    if (value === 'none') {
      setForm((prev) => ({ ...prev, regionId: null, townshipId: null }));
      setTownships([]);
      return;
    }
    const rid = parseInt(value);
    setForm((prev) => ({ ...prev, regionId: rid, townshipId: null }));
    api
      .get<ApiResponse<TownshipResponse[]>>(`/locations/regions/${rid}/townships`)
      .then(({ data }) => setTownships(data.data));
  };

  const handleInviteChange = (value: string) => {
    const invite = value === 'none' ? null : (value as InviteStatus);
    setForm((prev) => ({
      ...prev,
      inviteStatus: invite,
      actionType: inviteToAction(invite),
    }));
  };

  const handleAmountRange = (value: string) => {
    setAmountRange(value);
    if (value) {
      setAmountInput(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (!isEdit && !canCreate) {
      setError('CRM မှတ်တမ်းအသစ် ထည့်ခွင့် မရှိပါ (CRM_EDIT)');
      setSaving(false);
      return;
    }
    if (canBranchAll && !form.branchId) {
      setError('ဆိုင်ခွဲ ရွေးပေးပါ');
      setSaving(false);
      return;
    }
    if (!form.customerName.trim()) {
      setError('ကုန်သည် အမည် ထည့်ပေးပါ');
      setSaving(false);
      return;
    }
    if (!form.phone.trim()) {
      setError('ဖုန်းနံပါတ် ထည့်ပေးပါ');
      setSaving(false);
      return;
    }
    if (!form.inviteStatus) {
      setError('ပွဲ Status ရွေးပေးပါ');
      setSaving(false);
      return;
    }

    const amountValue =
      amountInput.trim() === '' ? 0 : Number(amountInput.replace(/,/g, ''));
    if (Number.isNaN(amountValue) || amountValue < 0) {
      setError('Amount မမှန်ကန်ပါ');
      setSaving(false);
      return;
    }
    // Match Laravel: amount must be at least 6 digits when provided via range
    if (!isEdit && amountValue > 0 && String(Math.floor(amountValue)).length < 6) {
      setError('Amount အနည်းဆုံး 6 လုံး ရှိရပါမယ်');
      setSaving(false);
      return;
    }

    try {
      const payload: CrmHistoryRequest = {
        branchId: form.branchId || null,
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        birthday: form.birthday || null,
        amount: amountValue,
        actionType: form.actionType || inviteToAction(form.inviteStatus),
        inviteStatus: form.inviteStatus,
        customerCondition: form.customerCondition || null,
        regionId: form.regionId,
        townshipId: form.townshipId || null,
        nrc: form.nrc || null,
        address: form.address || null,
        remark: form.remark || null,
      };
      if (isEdit) {
        await api.put(`/crm-history/${recordId}`, payload);
      } else {
        await api.post('/crm-history', payload);
      }
      router.push('/crm-history');
    } catch (err: unknown) {
      const errResp = err as { response?: { data?: { message?: string } } };
      setError(errResp.response?.data?.message || 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-[#f5f5f5]">
        <Loader2 className="h-6 w-6 animate-spin text-[#8c8c8c]" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#f5f5f5] dark:bg-neutral-950">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 border-b border-[#f0f0f0] bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900 sm:gap-3 sm:px-6 sm:py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => router.push('/crm-history')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-[#262626] dark:text-neutral-100 sm:text-[18px]">
              {isEdit ? 'CRM မှတ်တမ်း ပြင်ဆင်ရန်' : 'CRM မှတ်တမ်းအသစ်'}
            </h1>
            <p className="hidden text-xs text-[#8c8c8c] sm:block">
              {isEdit ? 'ဖောက်သည်အချက်အလက် ပြင်ဆင်ပါ' : 'ပွဲ Status ပါသော CRM မှတ်တမ်းအသစ် ထည့်ပါ'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="hidden h-9 sm:inline-flex"
            onClick={() => router.push('/crm-history')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="crm-history-form"
            className="h-9 min-w-[4.5rem] gap-1.5"
            disabled={saving || (!isEdit && !canCreate)}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </div>

        <form
          id="crm-history-form"
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-auto"
        >
          <div className="mx-auto w-full max-w-[1100px] px-6 py-5">
            <div className="rounded border border-[#f0f0f0] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="mb-1 text-[15px] font-medium text-[#262626] dark:text-neutral-100">
                Customer Information
              </h2>
              <p className="mb-6 text-xs text-[#8c8c8c]">အဟောင်း CRM create form အတိုင်း ထည့်သွင်းပါ</p>

              {error && (
                <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[#595959]">
                    ဆိုင် <span className="text-red-500">*</span>
                  </Label>
                  {canBranchAll ? (
                    <Select
                      value={form.branchId?.toString() || undefined}
                      onValueChange={(v) => setForm({ ...form, branchId: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="ဆိုင်ရွေးပါ" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id.toString()}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={user?.branchName || ''} disabled />
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#595959]">
                    ကုန်သည် အမည် <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    required
                    maxLength={160}
                    placeholder="Khi Zaw Taw"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#595959]">
                    ဖုန်းနံပါတ် <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    maxLength={40}
                    placeholder="09 250544470"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#595959]">မွေးနေ့</Label>
                  <Input
                    type="date"
                    value={form.birthday || ''}
                    onChange={(e) => setForm({ ...form, birthday: e.target.value || null })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#595959]">
                    ပွဲ Status <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.inviteStatus || undefined}
                    onValueChange={handleInviteChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="ရွေးချယ်ပါ" />
                    </SelectTrigger>
                    <SelectContent>
                      {INVITE_STATUSES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {INVITE_STATUS_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[#595959]">ဖောက်သည်အခြေအနေ (customer_condition)</Label>
                  <Input
                    value={form.customerCondition || ''}
                    onChange={(e) =>
                      setForm({ ...form, customerCondition: e.target.value || null })
                    }
                    maxLength={120}
                    placeholder="Legacy CRM customer_condition"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#595959]">Amount ကြား</Label>
                  <Select value={amountRange || undefined} onValueChange={handleAmountRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="ရွေးချယ်ပါ" />
                    </SelectTrigger>
                    <SelectContent>
                      {AMOUNT_RANGES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#595959]">Amount (MMK)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={amountInput}
                    onChange={(e) => {
                      setAmountInput(e.target.value);
                      setAmountRange('');
                    }}
                    placeholder="Amount ကြား က ရွေးပါ (သို့) ကိုယ်တိုင်ထည့်ပါ"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#595959]">Action Type</Label>
                  <Select
                    value={form.actionType}
                    onValueChange={(v) => setForm({ ...form, actionType: v as ActionType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {ACTION_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-[#8c8c8c]">ပွဲ Status ရွေးရင် အလိုအလျောက် ပြောင်းပါမယ်</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#595959]">ပြည်နယ် / တိုင်း</Label>
                  <Select
                    value={form.regionId?.toString() || 'none'}
                    onValueChange={handleRegionChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="ရွေးချယ်ပါ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-</SelectItem>
                      {regions.map((r) => (
                        <SelectItem key={r.id} value={r.id.toString()}>
                          {r.nameMm}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[#595959]">မြို့နယ်</Label>
                  <Select
                    value={form.townshipId?.toString() || 'none'}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        townshipId: v === 'none' ? null : parseInt(v),
                      })
                    }
                    disabled={!form.regionId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="ရွေးချယ်ပါ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-</SelectItem>
                      {townships.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          {t.nameMm}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[#595959]">မှတ်ပုံတင်အမှတ် (NRC)</Label>
                  <NrcPicker value={form.nrc} onChange={(nrc) => setForm({ ...form, nrc })} />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[#595959]">လိပ်စာ</Label>
                  <Input
                    value={form.address || ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    maxLength={400}
                    placeholder="အိမ်အမှတ်/လမ်း/ရပ်ကွက် ထည့်ပါ"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-[#595959]">REMARK</Label>
                  <Textarea
                    value={form.remark || ''}
                    onChange={(e) => setForm({ ...form, remark: e.target.value })}
                    maxLength={1000}
                    rows={3}
                    placeholder="remark"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
