'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { ApiResponse, AppSettingsResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save } from 'lucide-react';

export default function GeneralSettingsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [data, setData] = useState<AppSettingsResponse | null>(null);
  const [appName, setAppName] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [shopWhatsapp, setShopWhatsapp] = useState('');
  const [shopViber, setShopViber] = useState('');
  const [shopEyebrow, setShopEyebrow] = useState('');
  const [shopHeadline, setShopHeadline] = useState('');
  const [shopSubtitle, setShopSubtitle] = useState('');
  const [shopCtaLabel, setShopCtaLabel] = useState('');
  const [shopBrandLine, setShopBrandLine] = useState('');
  const [shopOfferBadge, setShopOfferBadge] = useState('');
  const [shopOfferBlurb, setShopOfferBlurb] = useState('');
  const [shopOfferCta, setShopOfferCta] = useState('');
  const [shopCollectionCta, setShopCollectionCta] = useState('');
  const [invitePopupEnabled, setInvitePopupEnabled] = useState(true);
  const [invitePopupTitle, setInvitePopupTitle] = useState('');
  const [invitePopupDate, setInvitePopupDate] = useState('');
  const [invitePopupSpecial, setInvitePopupSpecial] = useState('');
  const [inviteImageUrl, setInviteImageUrl] = useState<string | null>(null);
  const [inviteUploading, setInviteUploading] = useState(false);
  const [shopCheckoutEnabled, setShopCheckoutEnabled] = useState(false);
  const [shopOrdersEnabled, setShopOrdersEnabled] = useState(false);
  const [shopMmqrEnabled, setShopMmqrEnabled] = useState(false);
  const [shopMmqrNote, setShopMmqrNote] = useState('');
  const [mmqrImageUrl, setMmqrImageUrl] = useState<string | null>(null);
  const [mmqrUploading, setMmqrUploading] = useState(false);
  const [shopFavouritesEnabled, setShopFavouritesEnabled] = useState(true);
  const [shopCheckoutTerms, setShopCheckoutTerms] = useState('');
  const [userAgreement, setUserAgreement] = useState('');
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [shopContactPhone, setShopContactPhone] = useState('');
  const [shopContactEmail, setShopContactEmail] = useState('');
  const [shopContactAddress, setShopContactAddress] = useState('');
  const [shopContactHours, setShopContactHours] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const applyForm = useCallback((d: AppSettingsResponse) => {
    setAppName(d.appName);
    setAppVersion(d.appVersion);
    setShopWhatsapp(d.shopWhatsapp || '');
    setShopViber(d.shopViber || '');
    setShopEyebrow(d.shopEyebrow || '');
    setShopHeadline(d.shopHeadline || '');
    setShopSubtitle(d.shopSubtitle || '');
    setShopCtaLabel(d.shopCtaLabel || '');
    setShopBrandLine(d.shopBrandLine || '');
    setShopOfferBadge(d.shopOfferBadge || '');
    setShopOfferBlurb(d.shopOfferBlurb || '');
    setShopOfferCta(d.shopOfferCta || '');
    setShopCollectionCta(d.shopCollectionCta || '');
    setInvitePopupEnabled(d.invitePopupEnabled !== false);
    setInvitePopupTitle(d.invitePopupTitle || '');
    setInvitePopupDate(d.invitePopupDate || '');
    setInvitePopupSpecial(d.invitePopupSpecial || '');
    setInviteImageUrl(d.invitePopupImageUrl || null);
    setShopCheckoutEnabled(!!d.shopCheckoutEnabled);
    setShopOrdersEnabled(!!d.shopOrdersEnabled);
    setShopMmqrEnabled(!!d.shopMmqrEnabled);
    setShopMmqrNote(d.shopMmqrNote || '');
    setMmqrImageUrl(d.shopMmqrImageUrl || null);
    setShopFavouritesEnabled(d.shopFavouritesEnabled !== false);
    setShopCheckoutTerms(d.shopCheckoutTerms || '');
    setUserAgreement(d.userAgreement || '');
    setPrivacyPolicy(d.privacyPolicy || '');
    setShopContactPhone(d.shopContactPhone || '');
    setShopContactEmail(d.shopContactEmail || '');
    setShopContactAddress(d.shopContactAddress || '');
    setShopContactHours(d.shopContactHours || '');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get<ApiResponse<AppSettingsResponse>>('/settings/general');
      setData(res.data);
      applyForm(res.data);
    } catch {
      setError('Failed to load general settings');
    } finally {
      setLoading(false);
    }
  }, [applyForm]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!isAdmin) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const { data: res } = await api.put<ApiResponse<AppSettingsResponse>>('/settings/general', {
        appName: appName.trim(),
        appVersion: appVersion.trim(),
        shopWhatsapp: shopWhatsapp.trim() || null,
        shopViber: shopViber.trim() || null,
        shopEyebrow: shopEyebrow.trim() || null,
        shopHeadline: shopHeadline.trim() || null,
        shopSubtitle: shopSubtitle.trim() || null,
        shopCtaLabel: shopCtaLabel.trim() || null,
        shopBrandLine: shopBrandLine.trim() || null,
        shopOfferBadge: shopOfferBadge.trim() || null,
        shopOfferBlurb: shopOfferBlurb.trim() || null,
        shopOfferCta: shopOfferCta.trim() || null,
        shopCollectionCta: shopCollectionCta.trim() || null,
        invitePopupEnabled,
        invitePopupTitle: invitePopupTitle.trim() || null,
        invitePopupDate: invitePopupDate.trim() || null,
        invitePopupSpecial: invitePopupSpecial.trim() || null,
        shopCheckoutEnabled,
        shopOrdersEnabled,
        shopMmqrEnabled,
        shopMmqrNote: shopMmqrNote,
        shopFavouritesEnabled,
        shopCheckoutTerms: shopCheckoutTerms,
        userAgreement,
        privacyPolicy,
        shopContactPhone: shopContactPhone.trim() || null,
        shopContactEmail: shopContactEmail.trim() || null,
        shopContactAddress: shopContactAddress.trim() || null,
        shopContactHours: shopContactHours.trim() || null,
      });
      setData(res.data);
      applyForm(res.data);
      setMessage('Saved');
      window.dispatchEvent(new CustomEvent('sale-crm-app-settings', { detail: res.data }));
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Save failed';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function uploadInviteImage(file: File | null) {
    if (!isAdmin || !file) return;
    setInviteUploading(true);
    setMessage('');
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data: res } = await api.post<ApiResponse<AppSettingsResponse>>(
        '/settings/general/invite-image',
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setData(res.data);
      applyForm(res.data);
      setMessage('Invite image uploaded');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Upload failed';
      setError(msg);
    } finally {
      setInviteUploading(false);
    }
  }

  async function resetInviteImage() {
    if (!isAdmin) return;
    setInviteUploading(true);
    setMessage('');
    setError('');
    try {
      const { data: res } = await api.delete<ApiResponse<AppSettingsResponse>>(
        '/settings/general/invite-image'
      );
      setData(res.data);
      applyForm(res.data);
      setMessage('Invite image reset to default');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Reset failed';
      setError(msg);
    } finally {
      setInviteUploading(false);
    }
  }

  async function uploadMmqrImage(file: File | null) {
    if (!isAdmin || !file) return;
    setMmqrUploading(true);
    setMessage('');
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data: res } = await api.post<ApiResponse<AppSettingsResponse>>(
        '/settings/general/mmqr-image',
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setData(res.data);
      applyForm(res.data);
      setMessage('MMQR image uploaded');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Upload failed';
      setError(msg);
    } finally {
      setMmqrUploading(false);
    }
  }

  async function clearMmqrImage() {
    if (!isAdmin) return;
    setMmqrUploading(true);
    setMessage('');
    setError('');
    try {
      const { data: res } = await api.delete<ApiResponse<AppSettingsResponse>>(
        '/settings/general/mmqr-image'
      );
      setData(res.data);
      applyForm(res.data);
      setMessage('MMQR image cleared');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Clear failed';
      setError(msg);
    } finally {
      setMmqrUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-[#8c8c8c]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-3 sm:p-6">
      <header>
        <h2 className="hidden text-base font-medium text-[#262626] md:block dark:text-neutral-100">
          General
        </h2>
        <p className="text-sm text-[#8c8c8c] md:mt-1">
          App info, chat contacts, and editable shop storefront copy
        </p>
      </header>

      {message && <p className="text-sm text-emerald-600">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="space-y-4 rounded-xl border border-[#f0f0f0] bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-xs font-medium tracking-wide text-[#8c8c8c] uppercase">Application</p>
        <div className="space-y-1.5">
          <Label htmlFor="appName">Application Name</Label>
          <Input
            id="appName"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            disabled={!isAdmin}
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="appVersion">Version</Label>
          <Input
            id="appVersion"
            value={appVersion}
            onChange={(e) => setAppVersion(e.target.value)}
            disabled={!isAdmin}
            maxLength={40}
            placeholder="1.0.0"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shopWhatsapp">Shop WhatsApp</Label>
          <Input
            id="shopWhatsapp"
            value={shopWhatsapp}
            onChange={(e) => setShopWhatsapp(e.target.value)}
            disabled={!isAdmin}
            maxLength={40}
            placeholder="9599xxxxxxxx"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shopViber">Shop Viber</Label>
          <Input
            id="shopViber"
            value={shopViber}
            onChange={(e) => setShopViber(e.target.value)}
            disabled={!isAdmin}
            maxLength={40}
            placeholder="9599xxxxxxxx"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-[#f0f0f0] bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <p className="text-xs font-medium tracking-wide text-[#8c8c8c] uppercase">Shop Contact</p>
          <p className="mt-1 text-[11px] text-[#8c8c8c]">
            Shown on Shop → Contact. Phone / email / address / hours.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shopContactPhone">Contact Phone</Label>
          <Input
            id="shopContactPhone"
            value={shopContactPhone}
            onChange={(e) => setShopContactPhone(e.target.value)}
            disabled={!isAdmin}
            maxLength={40}
            placeholder="09…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shopContactEmail">Contact Email</Label>
          <Input
            id="shopContactEmail"
            type="email"
            value={shopContactEmail}
            onChange={(e) => setShopContactEmail(e.target.value)}
            disabled={!isAdmin}
            maxLength={120}
            placeholder="hello@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shopContactAddress">Address</Label>
          <Textarea
            id="shopContactAddress"
            value={shopContactAddress}
            onChange={(e) => setShopContactAddress(e.target.value)}
            disabled={!isAdmin}
            rows={3}
            maxLength={2000}
            placeholder="Street, township, city"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shopContactHours">Opening Hours</Label>
          <Input
            id="shopContactHours"
            value={shopContactHours}
            onChange={(e) => setShopContactHours(e.target.value)}
            disabled={!isAdmin}
            maxLength={200}
            placeholder="Mon–Sat 9:00–18:00"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-[#f0f0f0] bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <p className="text-xs font-medium tracking-wide text-[#8c8c8c] uppercase">Shop Hero</p>
          <p className="mt-1 text-[11px] text-[#8c8c8c]">
            Shown on /shop top banner. Leave headline blank to use Application Name.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shopEyebrow">Eyebrow</Label>
          <Input
            id="shopEyebrow"
            value={shopEyebrow}
            onChange={(e) => setShopEyebrow(e.target.value)}
            disabled={!isAdmin}
            maxLength={120}
            placeholder="Grand Opening · Gems & Jewellery"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shopHeadline">Headline</Label>
          <Input
            id="shopHeadline"
            value={shopHeadline}
            onChange={(e) => setShopHeadline(e.target.value)}
            disabled={!isAdmin}
            maxLength={200}
            placeholder={appName || 'Shop title'}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shopSubtitle">Subtitle</Label>
          <Textarea
            id="shopSubtitle"
            value={shopSubtitle}
            onChange={(e) => setShopSubtitle(e.target.value)}
            disabled={!isAdmin}
            rows={3}
            maxLength={1000}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shopCtaLabel">Hero CTA</Label>
          <Input
            id="shopCtaLabel"
            value={shopCtaLabel}
            onChange={(e) => setShopCtaLabel(e.target.value)}
            disabled={!isAdmin}
            maxLength={80}
            placeholder="Browse collection"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shopBrandLine">Brand line (header / footer)</Label>
          <Input
            id="shopBrandLine"
            value={shopBrandLine}
            onChange={(e) => setShopBrandLine(e.target.value)}
            disabled={!isAdmin}
            maxLength={120}
            placeholder="Gems & Jewellery"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-[#f0f0f0] bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <p className="text-xs font-medium tracking-wide text-[#8c8c8c] uppercase">
            Special / Limited Offer section
          </p>
          <p className="mt-1 text-[11px] text-[#8c8c8c]">
            Product-specific title still comes from each product&apos;s Offer headline.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shopOfferBadge">Offer badge</Label>
          <Input
            id="shopOfferBadge"
            value={shopOfferBadge}
            onChange={(e) => setShopOfferBadge(e.target.value)}
            disabled={!isAdmin}
            maxLength={80}
            placeholder="Grand Opening"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shopOfferBlurb">Offer blurb</Label>
          <Textarea
            id="shopOfferBlurb"
            value={shopOfferBlurb}
            onChange={(e) => setShopOfferBlurb(e.target.value)}
            disabled={!isAdmin}
            rows={2}
            maxLength={1000}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="shopOfferCta">Offer CTA</Label>
            <Input
              id="shopOfferCta"
              value={shopOfferCta}
              onChange={(e) => setShopOfferCta(e.target.value)}
              disabled={!isAdmin}
              maxLength={80}
              placeholder="View this piece"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shopCollectionCta">Collection CTA</Label>
            <Input
              id="shopCollectionCta"
              value={shopCollectionCta}
              onChange={(e) => setShopCollectionCta(e.target.value)}
              disabled={!isAdmin}
              maxLength={80}
              placeholder="Full collection"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-[#f0f0f0] bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-[#8c8c8c] uppercase">
              Invitation Popup
            </p>
            <p className="mt-1 text-[11px] text-[#8c8c8c]">
              Grand Opening invite on /shop. Copy link &amp; Share included.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-[#595959]">
            <input
              type="checkbox"
              checked={invitePopupEnabled}
              onChange={(e) => setInvitePopupEnabled(e.target.checked)}
              disabled={!isAdmin}
            />
            Show popup
          </label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inviteTitle">Title (Grand Opening)</Label>
          <Input
            id="inviteTitle"
            value={invitePopupTitle}
            onChange={(e) => setInvitePopupTitle(e.target.value)}
            disabled={!isAdmin}
            maxLength={200}
            placeholder="Grand Opening"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inviteDate">Date</Label>
          <Input
            id="inviteDate"
            value={invitePopupDate}
            onChange={(e) => setInvitePopupDate(e.target.value)}
            disabled={!isAdmin}
            maxLength={120}
            placeholder="19 July 2026 · 10:00 AM"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inviteSpecial">Special Offer</Label>
          <Textarea
            id="inviteSpecial"
            value={invitePopupSpecial}
            onChange={(e) => setInvitePopupSpecial(e.target.value)}
            disabled={!isAdmin}
            rows={2}
            maxLength={1000}
            placeholder="Exclusive jewellery offers for our Grand Opening"
          />
        </div>
        <div className="space-y-2">
          <Label>Invitation image</Label>
          <div className="flex flex-wrap items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                inviteImageUrl
                  ? `/api${inviteImageUrl.startsWith('/') ? inviteImageUrl : `/${inviteImageUrl}`}?v=1`
                  : '/shop/invite-default.png'
              }
              alt="Invite preview"
              className="h-36 w-28 rounded border border-[#f0f0f0] object-cover dark:border-neutral-700"
            />
            <div className="space-y-2">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={!isAdmin || inviteUploading}
                onChange={(e) => uploadInviteImage(e.target.files?.[0] || null)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!isAdmin || inviteUploading || !inviteImageUrl}
                onClick={resetInviteImage}
              >
                {inviteUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Reset to default
              </Button>
              <p className="text-[11px] text-[#8c8c8c]">
                Default uses invite.png style art. Upload replaces it.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-[#f0f0f0] bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <p className="text-xs font-medium tracking-wide text-[#8c8c8c] uppercase">
            Checkout, Orders &amp; Favourites
          </p>
          <p className="mt-1 text-[11px] text-[#8c8c8c]">
            Toggle storefront checkout, order tracking, MMQR, and favourites. Cart is always
            available; checkout/orders default off (inquiry-only). Favourites default on.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm text-[#595959]">
            <input
              type="checkbox"
              checked={shopCheckoutEnabled}
              onChange={(e) => setShopCheckoutEnabled(e.target.checked)}
              disabled={!isAdmin}
            />
            Enable Checkout (/shop/checkout)
          </label>
          <label className="flex items-center gap-2 text-sm text-[#595959]">
            <input
              type="checkbox"
              checked={shopOrdersEnabled}
              onChange={(e) => setShopOrdersEnabled(e.target.checked)}
              disabled={!isAdmin}
            />
            Enable Order tracking (/shop/orders)
          </label>
          <label className="flex items-center gap-2 text-sm text-[#595959]">
            <input
              type="checkbox"
              checked={shopMmqrEnabled}
              onChange={(e) => setShopMmqrEnabled(e.target.checked)}
              disabled={!isAdmin}
            />
            Enable MMQR payment on checkout
          </label>
          <label className="flex items-center gap-2 text-sm text-[#595959]">
            <input
              type="checkbox"
              checked={shopFavouritesEnabled}
              onChange={(e) => setShopFavouritesEnabled(e.target.checked)}
              disabled={!isAdmin}
            />
            Enable Favourites / wishlist (/shop/favourites)
          </label>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shopMmqrNote">MMQR payment note</Label>
          <Textarea
            id="shopMmqrNote"
            value={shopMmqrNote}
            onChange={(e) => setShopMmqrNote(e.target.value)}
            disabled={!isAdmin}
            rows={3}
            maxLength={1000}
            placeholder="Payee: 29 Jewellery · Scan with KBZPay / Wave Pay · enter last 6 digits of transaction as reference."
          />
        </div>
        <div className="space-y-2">
          <Label>MMQR image</Label>
          <div className="flex flex-wrap items-start gap-3">
            {mmqrImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api${mmqrImageUrl.startsWith('/') ? mmqrImageUrl : `/${mmqrImageUrl}`}?v=1`}
                alt="MMQR preview"
                className="h-36 w-36 rounded border border-[#f0f0f0] bg-white object-contain p-1 dark:border-neutral-700"
              />
            ) : (
              <div className="flex h-36 w-36 items-center justify-center rounded border border-dashed border-[#d9d9d9] text-xs text-[#8c8c8c] dark:border-neutral-700">
                No QR yet
              </div>
            )}
            <div className="space-y-2">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={!isAdmin || mmqrUploading}
                onChange={(e) => uploadMmqrImage(e.target.files?.[0] || null)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!isAdmin || mmqrUploading || !mmqrImageUrl}
                onClick={clearMmqrImage}
              >
                {mmqrUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Clear MMQR image
              </Button>
              <p className="text-[11px] text-[#8c8c8c]">
                Upload your bank / KBZ / Wave MMQR screenshot for customers to scan.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shopCheckoutTerms">Checkout Terms &amp; Conditions</Label>
          <Textarea
            id="shopCheckoutTerms"
            value={shopCheckoutTerms}
            onChange={(e) => setShopCheckoutTerms(e.target.value)}
            disabled={!isAdmin}
            rows={5}
            maxLength={8000}
            placeholder="Payment confirmation, delivery, returns… Leave blank to hide the agreement checkbox."
          />
          <p className="text-[11px] text-[#8c8c8c]">
            If filled, checkout requires “I agree” before placing an order.
          </p>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-[#f0f0f0] bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <p className="text-xs font-medium tracking-wide text-[#8c8c8c] uppercase">
            Legal Documents
          </p>
          <p className="mt-1 text-[11px] text-[#8c8c8c]">
            Editable User Agreement &amp; Privacy Policy (/agreement, /policy). Separate sections
            with a blank line. First line = heading.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="userAgreement">User Agreement</Label>
          <Textarea
            id="userAgreement"
            value={userAgreement}
            onChange={(e) => setUserAgreement(e.target.value)}
            disabled={!isAdmin}
            rows={10}
            maxLength={50000}
            className="font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="privacyPolicy">Privacy Policy</Label>
          <Textarea
            id="privacyPolicy"
            value={privacyPolicy}
            onChange={(e) => setPrivacyPolicy(e.target.value)}
            disabled={!isAdmin}
            rows={10}
            maxLength={50000}
            className="font-mono text-xs"
          />
        </div>
      </section>

      {isAdmin && (
        <Button type="button" size="sm" onClick={save} disabled={saving || !appName.trim()}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
      )}
      {!isAdmin && (
        <p className="text-xs text-[#8c8c8c]">Only ADMIN can edit these settings.</p>
      )}

      <dl className="divide-y divide-[#f0f0f0] rounded-xl border border-[#f0f0f0] bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
        <Row label="Timezone" value={data?.timezone || 'Asia/Yangon (UTC+06:30)'} />
        <Row label="Database" value={data?.database || 'PostgreSQL'} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-[#8c8c8c]">{label}</dt>
      <dd className="text-sm text-[#262626] dark:text-neutral-200">{value}</dd>
    </div>
  );
}
