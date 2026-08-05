'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import type { ApiResponse, N8nWebhookConfigResponse, N8nWebhookTestResponse } from '@/types';
import { CRM_PERMISSION_KEYS, usePermissionStore } from '@/lib/permission-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, Save, Send, Webhook } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const EVENT_HELP: Record<string, string> = {
  'showcase.created': 'Show Case item created',
  'showcase.updated': 'Show Case item updated',
  'showcase.deleted': 'Show Case item deleted',
  'sales.created': 'Sales transaction created',
  'inquiry.created': 'Shop inquiry submitted',
  'inquiry.status': 'Shop inquiry status changed',
  'order.created': 'Shop order created',
  'order.status': 'Shop order status changed',
  'webhook.test': 'Manual test ping',
};

export default function N8nWebhooksSettingsPage() {
  const router = useRouter();
  const canGeneral = usePermissionStore((s) => s.can(CRM_PERMISSION_KEYS.settingsGeneral));
  const loaded = usePermissionStore((s) => s.loaded);

  const [config, setConfig] = useState<N8nWebhookConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [enabled, setEnabled] = useState(false);
  const [outboundUrl, setOutboundUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [clearSecret, setClearSecret] = useState(false);
  const [inboundEnabled, setInboundEnabled] = useState(true);
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    if (loaded && !canGeneral) {
      router.replace('/settings/appearance');
    }
  }, [loaded, canGeneral, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<ApiResponse<N8nWebhookConfigResponse>>('/settings/webhooks/n8n');
      const cfg = data.data;
      setConfig(cfg);
      setEnabled(cfg.enabled);
      setOutboundUrl(cfg.outboundUrl || '');
      setSecret('');
      setClearSecret(false);
      setInboundEnabled(cfg.inboundEnabled);
      setEvents(cfg.events || []);
    } catch {
      setError('Failed to load n8n webhook settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canGeneral) void load();
  }, [canGeneral, load]);

  const inboundUrl = useMemo(() => {
    if (typeof window === 'undefined') return config?.inboundPath || '/api/webhooks/n8n';
    return `${window.location.origin}/api${config?.inboundPath || '/webhooks/n8n'}`;
  }, [config?.inboundPath]);

  function toggleEvent(event: string) {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  async function save() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const { data } = await api.put<ApiResponse<N8nWebhookConfigResponse>>(
        '/settings/webhooks/n8n',
        {
          enabled,
          outboundUrl: outboundUrl.trim(),
          secret: secret.trim() || undefined,
          clearSecret,
          events,
          inboundEnabled,
        }
      );
      setConfig(data.data);
      setSecret('');
      setClearSecret(false);
      setMessage('n8n webhook settings saved');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Save failed';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setMessage('');
    setError('');
    try {
      const { data } = await api.post<ApiResponse<N8nWebhookTestResponse>>(
        '/settings/webhooks/n8n/test'
      );
      const result = data.data;
      if (result.success) {
        setMessage(result.message || 'Test delivered');
      } else {
        setError(result.message || 'Test failed');
      }
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Test failed';
      setError(msg);
    } finally {
      setTesting(false);
    }
  }

  if (!canGeneral) return null;

  if (loading && !config) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-[#8c8c8c]">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#262626] dark:text-neutral-100">
            <Webhook className="h-5 w-5 text-primary" />
            n8n Webhooks
          </h2>
          <p className="mt-1 text-sm text-[#8c8c8c]">
            Connect Sale CRM events to n8n workflows (outbound) and accept calls from n8n (inbound).
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <section className="space-y-4 rounded-xl border border-[#e8e8e8] bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enable outbound webhooks (CRM → n8n)
        </label>

        <div className="space-y-1.5">
          <Label htmlFor="n8n-url">n8n Webhook URL</Label>
          <Input
            id="n8n-url"
            value={outboundUrl}
            onChange={(e) => setOutboundUrl(e.target.value)}
            placeholder="https://your-n8n.example/webhook/sale-crm"
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-[#8c8c8c]">
            n8n မှာ Webhook node ထည့် → Production URL ကို ဒီမှာ paste လုပ်ပါ။
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="n8n-secret">Shared secret</Label>
          <Input
            id="n8n-secret"
            type="password"
            value={secret}
            onChange={(e) => {
              setSecret(e.target.value);
              setClearSecret(false);
            }}
            placeholder={config?.hasSecret ? '•••••••• (leave blank to keep)' : 'Optional secret'}
          />
          {config?.hasSecret && (
            <label className="flex items-center gap-2 text-xs text-[#8c8c8c]">
              <input
                type="checkbox"
                checked={clearSecret}
                onChange={(e) => setClearSecret(e.target.checked)}
              />
              Clear existing secret
            </label>
          )}
          <p className="text-[11px] text-[#8c8c8c]">
            Outbound header: <code className="font-mono">X-SaleCRM-Signature</code> (HMAC-SHA256) +{' '}
            <code className="font-mono">X-Webhook-Secret</code>
          </p>
        </div>

        <div className="space-y-2">
          <Label>Events to send</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {(config?.availableEvents || Object.keys(EVENT_HELP))
              .filter((e) => e !== 'webhook.test')
              .map((event) => (
                <label
                  key={event}
                  className="flex items-start gap-2 rounded-lg border border-[#f0f0f0] px-3 py-2 text-sm dark:border-neutral-800"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={events.includes(event)}
                    onChange={() => toggleEvent(event)}
                  />
                  <span>
                    <span className="font-mono text-xs text-primary">{event}</span>
                    <span className="mt-0.5 block text-[11px] text-[#8c8c8c]">
                      {EVENT_HELP[event] || event}
                    </span>
                  </span>
                </label>
              ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void sendTest()}
            disabled={testing || !outboundUrl.trim()}
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send test
          </Button>
        </div>

        {(config?.lastDeliveryAt || config?.lastDeliveryStatus) && (
          <div className="rounded-lg bg-[#fafafa] px-3 py-2 text-xs text-[#595959] dark:bg-neutral-950 dark:text-neutral-300">
            Last delivery:{' '}
            <span className="font-medium">{config.lastDeliveryStatus || '—'}</span>
            {config.lastDeliveryAt ? ` · ${formatDateTime(config.lastDeliveryAt)}` : ''}
            {config.lastDeliveryError ? (
              <p className="mt-1 text-red-600">{config.lastDeliveryError}</p>
            ) : null}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-[#e8e8e8] bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={inboundEnabled}
            onChange={(e) => setInboundEnabled(e.target.checked)}
          />
          Enable inbound webhook (n8n → CRM)
        </label>
        <div className="space-y-1.5">
          <Label>Inbound URL for n8n HTTP Request</Label>
          <Input readOnly value={inboundUrl} className="font-mono text-sm" />
          <p className="text-[11px] text-[#8c8c8c]">
            Header required: <code className="font-mono">X-Webhook-Secret: &lt;your secret&gt;</code>
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-[#d9d9d9] bg-[#fafafa] p-3 text-xs text-[#595959] dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
          <p className="font-medium text-[#262626] dark:text-neutral-100">n8n setup (outbound)</p>
          <ol className="mt-1 list-decimal space-y-1 pl-4">
            <li>n8n → Add node → Webhook</li>
            <li>Copy Production URL → paste as Outbound URL above</li>
            <li>Save + Send test → workflow should receive JSON</li>
          </ol>
        </div>
      </section>

      {message && <p className="text-sm text-[#389e0d]">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
