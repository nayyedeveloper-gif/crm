'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { ApiResponse, BackupJobResponse, BackupSettingsResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Loader2, Play, RefreshCw, Save } from 'lucide-react';
import { formatDateTime, cn } from '@/lib/utils';

export default function BackupSettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [config, setConfig] = useState<BackupSettingsResponse | null>(null);
  const [jobs, setJobs] = useState<BackupJobResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [autoEnabled, setAutoEnabled] = useState(false);
  const [frequency, setFrequency] = useState('DAILY');
  const [timeOfDay, setTimeOfDay] = useState('02:00');
  const [retainDays, setRetainDays] = useState(30);
  const [destinationType, setDestinationType] = useState('LOCAL');
  const [destinationPath, setDestinationPath] = useState('./data/backups');
  const [driveFolderId, setDriveFolderId] = useState('');

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.replace('/settings/appearance');
    }
  }, [user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [c, j] = await Promise.all([
        api.get<ApiResponse<BackupSettingsResponse>>('/settings/backup/config'),
        api.get<ApiResponse<BackupJobResponse[]>>('/settings/backup/jobs'),
      ]);
      const cfg = c.data.data;
      setConfig(cfg);
      setAutoEnabled(cfg.autoEnabled);
      setFrequency(cfg.frequency);
      setTimeOfDay(cfg.timeOfDay?.slice(0, 5) || '02:00');
      setRetainDays(cfg.retainDays);
      setDestinationType(cfg.destinationType || 'LOCAL');
      setDestinationPath(cfg.destinationPath || './data/backups');
      setDriveFolderId(cfg.driveFolderId || '');
      setJobs(j.data.data);
    } catch {
      setError('Failed to load backup settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') load();
  }, [user, load]);

  async function saveConfig() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const { data } = await api.put<ApiResponse<BackupSettingsResponse>>(
        '/settings/backup/config',
        {
          autoEnabled,
          frequency,
          timeOfDay: timeOfDay.length === 5 ? `${timeOfDay}:00` : timeOfDay,
          retainDays,
          destinationType,
          destinationPath: destinationPath.trim(),
          driveFolderId: driveFolderId.trim() || null,
        }
      );
      setConfig(data.data);
      setMessage('Backup settings saved');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Save failed';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function runManual() {
    setRunning(true);
    setMessage('');
    setError('');
    try {
      const { data } = await api.post<ApiResponse<BackupJobResponse>>('/settings/backup/run');
      setMessage(
        data.data.status === 'SUCCESS'
          ? `Manual backup completed (${data.data.recordCount ?? 0} records) → ${data.data.destinationPath || ''}`
          : `Backup failed: ${data.data.errorMessage || 'unknown'}`
      );
      await load();
    } catch {
      setError('Manual backup failed');
    } finally {
      setRunning(false);
    }
  }

  async function downloadJob(id: number, filename: string | null) {
    try {
      const res = await api.get(`/settings/backup/jobs/${id}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `backup-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Download failed');
    }
  }

  if (user?.role !== 'ADMIN') return null;

  if (loading && !config) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-[#8c8c8c]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-3 sm:space-y-8 sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="hidden text-base font-medium text-[#262626] md:block dark:text-neutral-100">
            Backup
          </h2>
          <p className="text-sm text-[#8c8c8c] md:mt-1">
            Choose destination, schedule, and run manual backups
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 shrink-0 p-0 sm:w-auto sm:gap-1.5 sm:px-3"
          onClick={load}
          aria-label="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </header>

      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Destination */}
      <section className="space-y-4 rounded-xl border border-[#f0f0f0] bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-sm font-medium text-[#262626] dark:text-neutral-100">
          Backup Location
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Destination</Label>
            <Select
              value={destinationType}
              onValueChange={(v) => {
                setDestinationType(v);
                if (v === 'LOCAL' && !destinationPath) setDestinationPath('./data/backups');
                if (v === 'OTHER' && destinationPath === './data/backups') {
                  setDestinationPath('/mnt/backup/sale-crm');
                }
                if (v === 'GOOGLE_DRIVE' && !destinationPath.includes('drive')) {
                  setDestinationPath('./data/backups/drive-staging');
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOCAL">Local disk</SelectItem>
                <SelectItem value="GOOGLE_DRIVE">Google Drive</SelectItem>
                <SelectItem value="OTHER">Other (NAS / external path)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dest-path">
              {destinationType === 'GOOGLE_DRIVE' ? 'Staging path (server)' : 'Path'}
            </Label>
            <Input
              id="dest-path"
              value={destinationPath}
              onChange={(e) => setDestinationPath(e.target.value)}
              placeholder="./data/backups"
            />
          </div>
        </div>
        {destinationType === 'GOOGLE_DRIVE' && (
          <div className="space-y-1.5">
            <Label htmlFor="drive-folder">Google Drive Folder ID</Label>
            <Input
              id="drive-folder"
              value={driveFolderId}
              onChange={(e) => setDriveFolderId(e.target.value)}
              placeholder="1a2b3cFolderId..."
            />
            <p className="text-xs text-[#8c8c8c]">
              Files are written to the staging path first. Drive upload API can be connected later
              using this folder ID.
            </p>
          </div>
        )}
        {destinationType === 'OTHER' && (
          <p className="text-xs text-[#8c8c8c]">
            Use a mounted network share or external disk path reachable by the server process.
          </p>
        )}
      </section>

      {/* Auto backup */}
      <section className="space-y-4 rounded-xl border border-[#f0f0f0] bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-[#262626] dark:text-neutral-100">
              Automatic Backup
            </h3>
            <p className="mt-0.5 text-xs text-[#8c8c8c]">
              Last auto run:{' '}
              {config?.lastAutoRunAt ? formatDateTime(config.lastAutoRunAt) : 'Never'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoEnabled}
            onClick={() => setAutoEnabled(!autoEnabled)}
            className={cn(
              'relative h-5 w-10 shrink-0 rounded-full transition-colors',
              autoEnabled ? 'bg-primary' : 'bg-[#00000040] dark:bg-neutral-600'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                autoEnabled ? 'left-5' : 'left-0.5'
              )}
            />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="backup-time">Time (Asia/Yangon)</Label>
            <Input
              id="backup-time"
              type="time"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="retain">Retain (days)</Label>
            <Input
              id="retain"
              type="number"
              min={1}
              max={365}
              value={retainDays}
              onChange={(e) => setRetainDays(Number(e.target.value) || 30)}
            />
          </div>
        </div>

        <Button type="button" size="sm" onClick={saveConfig} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save settings
        </Button>
      </section>

      {/* Manual */}
      <section className="space-y-3 rounded-xl border border-[#f0f0f0] bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-sm font-medium text-[#262626] dark:text-neutral-100">
          Manual Backup
        </h3>
        <p className="text-xs text-[#8c8c8c]">
          Export all CRM History records to the selected destination immediately.
        </p>
        <Button type="button" size="sm" onClick={runManual} disabled={running}>
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          Run backup now
        </Button>
      </section>

      {/* History */}
      <section>
        <h3 className="mb-3 text-sm font-medium text-[#262626] dark:text-neutral-100">
          Backup History
        </h3>

        {/* Mobile cards */}
        <div className="space-y-2 md:hidden">
          {jobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d9d9d9] bg-white py-10 text-center text-sm text-[#8c8c8c] dark:border-neutral-700 dark:bg-neutral-900">
              No backups yet
            </div>
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-xl border border-[#f0f0f0] bg-white p-3.5 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#262626] dark:text-neutral-100">
                      {job.jobType}
                      <span className="mx-1.5 text-[#d9d9d9]">·</span>
                      <span className="text-xs font-normal text-[#8c8c8c]">
                        {job.destinationType || '—'}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-[#8c8c8c]">
                      {formatDateTime(job.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={cn(
                        'text-xs font-medium',
                        job.status === 'SUCCESS' && 'text-emerald-600',
                        job.status === 'FAILED' && 'text-red-600',
                        job.status === 'RUNNING' && 'text-amber-600'
                      )}
                    >
                      {job.status}
                    </span>
                    {job.status === 'SUCCESS' && (
                      <button
                        type="button"
                        onClick={() => downloadJob(job.id, job.filename)}
                        className="rounded-lg p-1.5 text-[#8c8c8c] hover:bg-[#f5f5f5] hover:text-primary dark:hover:bg-neutral-800"
                        aria-label="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex gap-3 text-xs text-[#8c8c8c]">
                  <span>
                    Records:{' '}
                    <span className="tabular-nums text-[#595959]">
                      {job.recordCount ?? '—'}
                    </span>
                  </span>
                  <span>
                    Size:{' '}
                    <span className="tabular-nums text-[#595959]">
                      {job.sizeBytes != null
                        ? `${Math.max(1, Math.round(job.sizeBytes / 1024)).toLocaleString()} KB`
                        : '—'}
                    </span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-hidden rounded-xl border border-[#f0f0f0] bg-white dark:border-neutral-800 dark:bg-neutral-900 md:block">
          <table className="w-full text-sm">
            <thead className="bg-[#fafafa] text-[#8c8c8c] dark:bg-neutral-950">
              <tr className="border-b border-[#f0f0f0] dark:border-neutral-800">
                <th className="px-3 py-2 text-left font-normal">When</th>
                <th className="px-3 py-2 text-left font-normal">Type</th>
                <th className="px-3 py-2 text-left font-normal">Dest</th>
                <th className="px-3 py-2 text-left font-normal">Status</th>
                <th className="px-3 py-2 text-right font-normal">Records</th>
                <th className="px-3 py-2 text-right font-normal">Size</th>
                <th className="w-12 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-[#8c8c8c]">
                    No backups yet
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-[#f0f0f0] last:border-0 dark:border-neutral-800"
                  >
                    <td className="px-3 py-2 text-xs">{formatDateTime(job.createdAt)}</td>
                    <td className="px-3 py-2">{job.jobType}</td>
                    <td className="max-w-[140px] truncate px-3 py-2 text-xs text-[#8c8c8c]" title={job.destinationPath || ''}>
                      {job.destinationType || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          'text-xs',
                          job.status === 'SUCCESS' && 'text-emerald-600',
                          job.status === 'FAILED' && 'text-red-600',
                          job.status === 'RUNNING' && 'text-amber-600'
                        )}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {job.recordCount ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs text-[#8c8c8c]">
                      {job.sizeBytes != null
                        ? `${Math.max(1, Math.round(job.sizeBytes / 1024)).toLocaleString()} KB`
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {job.status === 'SUCCESS' && (
                        <button
                          type="button"
                          onClick={() => downloadJob(job.id, job.filename)}
                          className="rounded p-1 text-[#8c8c8c] hover:bg-[#f5f5f5] hover:text-primary dark:hover:bg-neutral-800"
                          aria-label="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
