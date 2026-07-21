'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import type {
  ApiResponse,
  PageResponse,
  CrmHistoryResponse,
  ActionType,
  RegionResponse,
  TownshipResponse,
} from '@/types';
import { ACTION_TYPE_LABELS, ACTION_TYPE_COLORS } from '@/types';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const ACTION_TYPES: ActionType[] = ['PURCHASE', 'INQUIRY', 'FOLLOW_UP', 'COMPLAINT', 'OTHER'];

export default function CrmHistoryListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<PageResponse<CrmHistoryResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState<RegionResponse[]>([]);
  const [townships, setTownships] = useState<TownshipResponse[]>([]);
  const [townshipRegionId, setTownshipRegionId] = useState<string>('');

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [actionType, setActionType] = useState(searchParams.get('actionType') || 'all');
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
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
    if (phone) params.set('phone', phone);
    if (regionId !== 'all') params.set('regionId', regionId);
    if (townshipId !== 'all') params.set('townshipId', townshipId);

    const branchId = searchParams.get('branchId');
    if (branchId) params.set('branchId', branchId);

    try {
      const { data: resp } = await api.get<ApiResponse<PageResponse<CrmHistoryResponse>>>(
        `/crm-history?${params.toString()}`
      );
      setData(resp.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, size, search, actionType, phone, regionId, townshipId, searchParams]);

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
    setPhone('');
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
    if (phone) params.set('phone', phone);
    if (regionId !== 'all') params.set('regionId', regionId);
    if (townshipId !== 'all') params.set('townshipId', townshipId);
    const branchId = searchParams.get('branchId');
    if (branchId) params.set('branchId', branchId);

    const token = localStorage.getItem('accessToken');
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
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button className="flex-1 sm:flex-none" onClick={() => router.push('/crm-history/new')}>
            <Plus className="h-4 w-4" />
            New Record
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
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
              <label className="text-xs font-medium text-muted-foreground">Phone</label>
              <Input
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
              />
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
                  <button
                    key={item.id}
                    type="button"
                    className="w-full rounded-xl border border-[#f0f0f0] bg-white p-3.5 text-left active:bg-[#fafafa] dark:border-neutral-800 dark:bg-neutral-900"
                    onClick={() => router.push(`/crm-history/${item.id}`)}
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
                        </div>
                        <p className="mt-1 truncate text-[15px] font-semibold text-[#262626] dark:text-neutral-100">
                          {item.customerName}
                        </p>
                        <p className="mt-0.5 text-sm text-[#595959]">{item.phone}</p>
                      </div>
                      <p className="shrink-0 font-mono text-sm font-medium text-[#262626] dark:text-neutral-100">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[#8c8c8c]">
                      <span className="truncate">{item.branchName}</span>
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
                  </button>
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
                    <TableHead>Amount</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Branch</TableHead>
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
                      <TableCell className="font-mono">{formatCurrency(item.amount)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={ACTION_TYPE_COLORS[item.actionType]}
                        >
                          {ACTION_TYPE_LABELS[item.actionType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.branchName}</TableCell>
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
