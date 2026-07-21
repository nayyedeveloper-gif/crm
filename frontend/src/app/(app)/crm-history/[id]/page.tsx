'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import type { ApiResponse, CrmHistoryResponse } from '@/types';
import { ACTION_TYPE_LABELS, ACTION_TYPE_COLORS } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, Pencil, Loader2, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function CrmHistoryDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<CrmHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (params?.id) {
      api
        .get<ApiResponse<CrmHistoryResponse>>(`/crm-history/${params.id}`)
        .then(({ data }) => setData(data.data))
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    }
  }, [params]);

  const handleDelete = async () => {
    if (!data) return;
    setDeleting(true);
    try {
      await api.delete(`/crm-history/${data.id}`);
      router.push('/crm-history');
    } catch {
      // handled by interceptor
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground">Record not found.</p>
        <Button variant="outline" onClick={() => router.push('/crm-history')}>
          Back to List
        </Button>
      </div>
    );
  }

  const fields = [
    { label: 'ဖောက်သည်အမည်', value: data.customerName },
    { label: 'ဖုန်းနံပါတ်', value: data.phone },
    { label: 'မွေးနေ့', value: formatDate(data.birthday) },
    { label: 'ပမာဏ', value: formatCurrency(data.amount) },
    { label: 'ဆိုင်', value: data.branchName },
    { label: 'တိုင်းဒေသကြီး / ပြည်နယ်', value: data.regionName || '-' },
    { label: 'မြို့နယ်', value: data.townshipName || '-' },
    { label: 'မှတ်ပုံတင်အမှတ်', value: data.nrc || '-' },
    { label: 'လိပ်စာ', value: data.address || '-' },
    { label: 'မှတ်ချက်', value: data.remark || '-' },
    { label: 'ထည့်သွင့်သူ', value: data.createdBy || '-' },
    { label: 'ထည့်သွင့်ချိန်', value: formatDateTime(data.createdAt) },
    { label: 'ပြင်ဆင်သူ', value: data.updatedBy || '-' },
    { label: 'ပြင်ဆင်ချိန်', value: formatDateTime(data.updatedAt) },
  ];

  return (
    <div className="space-y-4 p-3 sm:space-y-6 sm:p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/crm-history')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="hidden text-2xl font-bold md:block">အသေးစိတ်အချက်အလက်</h1>
            <p className="text-sm text-muted-foreground">မှတ်တမ်း #{data.id}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 md:hidden"
            onClick={() => router.push(`/crm-history/${data.id}/edit`)}
            aria-label="ပြင်ဆင်ရန်"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="h-9 w-9 md:hidden"
            onClick={() => setDeleteOpen(true)}
            aria-label="ဖျက်ရန်"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden md:inline-flex"
            onClick={() => router.push(`/crm-history/${data.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            ပြင်ဆင်ရန်
          </Button>
          <Button
            variant="destructive"
            className="hidden md:inline-flex"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            ဖျက်ရန်
          </Button>
        </div>
      </div>

      <Card className="rounded-xl border-[#f0f0f0] shadow-none">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>ဖောက်သည်အချက်အလက်</CardTitle>
            <Badge variant="outline" className={ACTION_TYPE_COLORS[data.actionType]}>
              {ACTION_TYPE_LABELS[data.actionType]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => (
              <div key={field.label} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {field.label}
                </label>
                <div className="text-sm">{field.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>မှတ်တမ်းဖျက်ရန်</DialogTitle>
            <DialogDescription>
              ဤမှတ်တမ်းကို ဖျက်ပစ်မှာ သေချာပါသလား? ပြန်မပြင်နိုင်ပါ။
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              မလုပ်တော့
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              ဖျက်ရန်
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
