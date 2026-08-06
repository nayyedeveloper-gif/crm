'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import type {
  ApiResponse,
  PageResponse,
  CrmHistoryResponse,
  CrmHistoryAmountSummary,
  ActionType,
  InviteStatus,
  RegionResponse,
  TownshipResponse,
} from '@/types';
import { ACTION_TYPE_LABELS, ACTION_TYPE_COLORS, INVITE_STATUS_LABELS, INVITE_STATUS_COLORS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Search, Plus, Eye, Pencil, Trash2, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';
import { CRM_PERMISSION_KEYS, usePermissionStore } from '@/lib/permission-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const ACTION_TYPES: ActionType[] = ['PURCHASE', 'INQUIRY', 'FOLLOW_UP', 'COMPLAINT', 'OTHER'];
const INVITE_STATUSES: InviteStatus[] = [
  'ATTEND',
  'NOT_ATTEND',
  'UNREACHABLE',
  'NOT_ANSWERED',
  'PHONE_OFF',
];
const AMOUNT_BUCKETS = [
  { value: 'amount_50_to_100', label: '50 - 100', key: 'amount50To100' as const },
  { value: 'amount_100_to_300', label: '100 - 300', key: 'amount100To300' as const },
  { value: 'amount_300_to_500', label: '300 - 500', key: 'amount300To500' as const },
  { value: 'amount_500_to_1000', label: '500 - 1000', key: 'amount500To1000' as const },
  { value: 'amount_above_1000', label: '1000 အထက်', key: 'amountAbove1000' as const },
  { value: 'amount_other', label: 'အခြား', key: 'amountOther' as const },
];

export default function CrmHistoryListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canEditCrm = usePermissionStore((s) => s.canEditCrm());
  const canExport = usePermissionStore((s) => s.can(CRM_PERMISSION_KEYS.crmExport));

  const [data, setData] = useState<PageResponse<CrmHistoryResponse> | null>(null);
  const [amountSummary, setAmountSummary] = useState<CrmHistoryAmountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState<RegionResponse[]>([]);
  const [townships, setTownships] = useState<TownshipResponse[]>([]);
  const [townshipRegionId, setTownshipRegionId] = useState<string>('');

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [actionType, setActionType] = useState(searchParams.get('actionType') || 'all');
  const [inviteStatus, setInviteStatus] = useState(searchParams.get('inviteStatus') || 'all');
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
  const [createdBy, setCreatedBy] = useState(searchParams.get('createdBy') || '');
  const [fromDate, setFromDate] = useState(searchParams.get('fromDate') || '');
  const [toDate, setToDate] = useState(searchParams.get('toDate') || '');
  const [amountBucket, setAmountBucket] = useState(searchParams.get('amountBucket') || 'all');
  const [regionId, setRegionId] = useState(searchParams.get('regionId') || 'all');
  const [townshipId, setTownshipId] = useState(searchParams.get('townshipId') || 'all');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '0'));
  const [size] = useState(20);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('size', size.toString());
    if (search) params.set('search', search);
    if (actionType !== 'all') params.set('actionType', actionType);
    if (inviteStatus !== 'all') params.set('inviteStatus', inviteStatus);
    if (phone) params.set('phone', phone);
    if (createdBy) params.set('createdBy', createdBy);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    if (amountBucket !== 'all') params.set('amountBucket', amountBucket);
    if (regionId !== 'all') params.set('regionId', regionId);
    if (townshipId !== 'all') params.set('townshipId', townshipId);

    const branchId = searchParams.get('branchId');
    if (branchId) params.set('branchId', branchId);

    try {
      const summaryParams = new URLSearchParams(params);
      summaryParams.delete('amountBucket');
      const [listResp, summaryResp] = await Promise.all([
        api.get<ApiResponse<PageResponse<CrmHistoryResponse>>>(`/crm-history?${params.toString()}`),
        api.get<ApiResponse<CrmHistoryAmountSummary>>(
          `/crm-history/amount-summary?${summaryParams.toString()}`
        ),
      ]);
      const resp = listResp.data;
      setData(resp.data);
      setAmountSummary(summaryResp.data.data);
    } catch {
      setData(null);
      setAmountSummary(null);
    } finally {
      setLoading(false);
    }
  }, [page, size, search, actionType, inviteStatus, phone, createdBy, fromDate, toDate, amountBucket, regionId, townshipId, searchParams]);

  useEffect(() => {
    api.get<ApiResponse<RegionResponse[]>>('/locations/regions').then(({ data }) => {
      setRegions(data.data);
    });
  }, []);

  useEffect(() => {
    if (regionId !== 'all') {
      setTownshipRegionId(regionId);
      api
        .get<ApiResponse<TownshipResponse[]>>(`/locations/regions/${regionId}/townships`)
        .then(({ data }) => setTownships(data.data));
    } else {
      setTownships([]);
      setTownshipId('all');
      setTownshipRegionId('');
    }
  }, [regionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilter = () => {
    setPage(0);
    fetchData();
  };

  const handleReset = () => {
    setSearch('');
    setActionType('all');
    setInviteStatus('all');
    setPhone('');
    setCreatedBy('');
    setFromDate('');
    setToDate('');
    setAmountBucket('all');
    setRegionId('all');
    setTownshipId('all');
    setPage(0);
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    setDeleting(true);
    try {
      await api.delete(`/crm-history/${deleteId}`);
      setDeleteId(null);
      fetchData();
    } catch {
      // error handled by interceptor
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (actionType !== 'all') params.set('actionType', actionType);
    if (inviteStatus !== 'all') params.set('inviteStatus', inviteStatus);
    if (phone) params.set('phone', phone);
    if (createdBy) params.set('createdBy', createdBy);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    if (amountBucket !== 'all') params.set('amountBucket', amountBucket);
    if (regionId !== 'all') params.set('regionId', regionId);
    if (townshipId !== 'all') params.set('townshipId', townshipId);
    const branchId = searchParams.get('branchId');
    if (branchId) params.set('branchId', branchId);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
    window.open(`${baseUrl}/crm-history/export?${params.toString()}`, '_blank');
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="hidden md:block">
          <h1 className="text-xl font-bold md:text-2xl">CRM History</h1>
          <p className="text-sm text-muted-foreground">Manage customer interaction records</p>
        </div>
        <div className="flex gap-2">
          {canExport && (
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
          {canEditCrm && (
            <Button className="flex-1 sm:flex-none" onClick={() => router.push('/crm-history/new')}>
              <Plus className="h-4 w-4" />
              Create
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <Input
                placeholder="Name, phone, remark..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Action Type</label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {ACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ACTION_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Invite Status</label>
              <Select value={inviteStatus} onValueChange={setInviteStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {INVITE_STATUSES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {INVITE_STATUS_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Phone</label>
              <Input
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Created By</label>
              <Input
                placeholder="ဖန်တီးသူ"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Amount Range</label>
              <Select value={amountBucket} onValueChange={setAmountBucket}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {AMOUNT_BUCKETS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">From Date</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">To Date</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Region</label>
              <Select value={regionId} onValueChange={setRegionId}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {r.nameMm} ({r.nameEn})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Township</label>
              <Select
                value={townshipId}
                onValueChange={setTownshipId}
                disabled={!townshipRegionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {townships.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.nameMm}{t.nameEn ? ` (${t.nameEn})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={handleFilter}>
              <Search className="h-4 w-4" />
              Filter
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">ငွေကြေးအပိုင်း အရေအတွက်:</span>
        {AMOUNT_BUCKETS.map((b) => {
          const count = amountSummary ? amountSummary[b.key] : 0;
          const active = amountBucket === b.value;
          return (
            <button
              key={b.value}
              type="button"
              onClick={() => {
                setAmountBucket(active ? 'all' : b.value);
                setPage(0);
              }}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-[#e5e7eb] bg-white text-[#4b5563] hover:bg-[#f9fafb] dark:border-neutral-700 dark:bg-neutral-900'
              )}
            >
              {b.label} <span className="font-semibold">({count.toLocaleString()})</span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data && data.content.length > 0 ? (
            <>
              {/* Mobile cards */}
              <div className="space-y-2 p-3 md:hidden">
                {data.content.map((item, index) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    className="w-full rounded-xl border border-[#f0f0f0] bg-white p-3.5 text-left active:bg-[#fafafa] dark:border-neutral-800 dark:bg-neutral-900"
                    onClick={() => router.push(`/crm-history/${item.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/crm-history/${item.id}`);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[#8c8c8c]">#{page * size + index + 1}</span>
                          <Badge
                            variant="outline"
                            className={cn('shrink-0', ACTION_TYPE_COLORS[item.actionType])}
                          >
                            {ACTION_TYPE_LABELS[item.actionType]}
                          </Badge>
                          {item.inviteStatus && (
                            <Badge
                              variant="outline"
                              className={cn('shrink-0', INVITE_STATUS_COLORS[item.inviteStatus])}
                            >
                              {INVITE_STATUS_LABELS[item.inviteStatus]}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 truncate text-[15px] font-semibold text-[#262626] dark:text-neutral-100">
                          {item.customerName}
                        </p>
                        <p className="mt-0.5 text-sm text-[#595959]">{item.phone}</p>
                        <p className="mt-0.5 text-xs text-[#8c8c8c]">
                          {item.birthday || '-'} · {item.regionName || '-'} / {item.townshipName || '-'}
                        </p>
                      </div>
                      <p className="shrink-0 font-mono text-sm font-medium text-[#262626] dark:text-neutral-100">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[#8c8c8c]">
                      <span className="truncate">{item.branchName} · {item.createdBy || '-'}</span>
                      <span className="shrink-0">{formatDateTime(item.createdAt)}</span>
                    </div>
                    {item.remark && (
                      <p className="mt-1.5 line-clamp-2 text-xs text-[#8c8c8c]">{item.remark}</p>
                    )}
                    <div className="mt-2.5 flex gap-1 border-t border-[#f5f5f5] pt-2 dark:border-neutral-800">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/crm-history/${item.id}`);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/crm-history/${item.id}/edit`);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 flex-1 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(item.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No.</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Invite</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Region/Township</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Remark</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.content.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">
                        {page * size + index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{item.customerName}</TableCell>
                      <TableCell>{item.phone}</TableCell>
                      <TableCell>{item.birthday || '-'}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(item.amount)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={ACTION_TYPE_COLORS[item.actionType]}
                        >
                          {ACTION_TYPE_LABELS[item.actionType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.inviteStatus ? (
                          <Badge
                            variant="outline"
                            className={INVITE_STATUS_COLORS[item.inviteStatus]}
                          >
                            {INVITE_STATUS_LABELS[item.inviteStatus]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{item.branchName}</TableCell>
                      <TableCell className="text-sm">
                        {(item.regionName || '-') + ' / ' + (item.townshipName || '-')}
                      </TableCell>
                      <TableCell className="text-sm">{item.createdBy || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {item.remark || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/crm-history/${item.id}`)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/crm-history/${item.id}/edit`)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(item.id)}
                            title="Delete"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              <div className="flex items-center justify-between gap-2 border-t px-3 py-3 md:px-4 md:py-4">
                <div className="text-xs text-muted-foreground md:text-sm">
                  Page {data.page + 1}/{data.totalPages} ({data.totalElements})
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data.hasPrevious}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data.hasNext}
                    onClick={() => setPage(page + 1)}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <p>No records found.</p>
              <Button variant="outline" size="sm" onClick={() => router.push('/crm-history/new')}>
                <Plus className="h-4 w-4" />
                Create the first record
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this CRM history record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
