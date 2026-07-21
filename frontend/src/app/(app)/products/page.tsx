'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import type { ApiResponse, ProductCategoryResponse, ProductResponse } from '@/types';
import { PRODUCT_IMAGE_SLOTS } from '@/types';
import { adminSpecLabels, jewelleryKind } from '@/lib/jewellery-specs';
import { JewelleryWeightFields } from '@/components/products/jewellery-weight-fields';
import { prepareShopImage, prepareOfferImage, shopImageHint, shopImageSizeGuide, offerImageHint, offerImageSizeGuide } from '@/lib/shop-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Plus,
  RefreshCw,
  Pencil,
  QrCode,
  Trash2,
  ExternalLink,
  ImagePlus,
  Tags,
  Search,
  X,
  SlidersHorizontal,
  Camera,
  Images,
} from 'lucide-react';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';
import QRCode from 'qrcode';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

type StatusFilter = 'all' | 'active' | 'inactive';
type FlagFilter = 'all' | 'yes' | 'no';
type PriceFilter = 'all' | 'priced' | 'inquiry' | 'discount';
type SlotKey = 'front' | 'back' | 'side' | 'other';

function ProductPhotoSlot({
  label,
  preview,
  onPick,
  onClear,
  aspectClass = 'aspect-square',
  objectClass = 'object-contain',
  hint,
}: {
  label: string;
  preview?: string;
  onPick: (file: File | null) => void;
  onClear: () => void;
  aspectClass?: string;
  objectClass?: string;
  hint?: string;
}) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [chooserOpen, setChooserOpen] = useState(false);

  function handleFile(file: File | null) {
    setChooserOpen(false);
    if (galleryRef.current) galleryRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
    if (file) onPick(file);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setChooserOpen(true)}
        className={cn(
          'group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#d9d9d9] bg-[#fafafa] text-left transition active:bg-[#f0f0f0] dark:border-neutral-700 dark:bg-neutral-950',
          aspectClass
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={label} className={cn('h-full w-full', objectClass)} />
        ) : (
          <>
            <ImagePlus className="h-6 w-6 text-[#bfbfbf]" />
            <span className="mt-1 text-xs text-[#8c8c8c]">{label}</span>
            <span className="mt-0.5 text-[10px] text-[#bfbfbf]">{hint || 'Camera / Gallery'}</span>
          </>
        )}
        {preview && (
          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
            {label}
          </span>
        )}
      </button>

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
      />

      {chooserOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={() => setChooserOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl bg-white shadow-xl dark:bg-neutral-900 sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={`${label} photo`}
          >
            <div className="border-b border-[#f0f0f0] px-4 py-3 dark:border-neutral-800">
              <p className="text-base font-semibold text-[#262626] dark:text-neutral-100">
                {label} photo
              </p>
              <p className="text-xs text-[#8c8c8c]">Camera or gallery</p>
            </div>
            <div className="flex flex-col p-2">
              <button
                type="button"
                className="flex min-h-12 items-center gap-3 rounded-lg px-3 py-3 text-sm text-[#262626] active:bg-[#f5f5f5] dark:text-neutral-100 dark:active:bg-neutral-800"
                onClick={() => cameraRef.current?.click()}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e6f4ff] text-primary">
                  <Camera className="h-4 w-4" />
                </span>
                Take photo
              </button>
              <button
                type="button"
                className="flex min-h-12 items-center gap-3 rounded-lg px-3 py-3 text-sm text-[#262626] active:bg-[#f5f5f5] dark:text-neutral-100 dark:active:bg-neutral-800"
                onClick={() => galleryRef.current?.click()}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f5f5] text-[#595959] dark:bg-neutral-800">
                  <Images className="h-4 w-4" />
                </span>
                Choose from gallery
              </button>
              {preview && (
                <button
                  type="button"
                  className="flex min-h-12 items-center gap-3 rounded-lg px-3 py-3 text-sm text-red-600 active:bg-red-50 dark:active:bg-red-950/30"
                  onClick={() => {
                    setChooserOpen(false);
                    onClear();
                  }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40">
                    <Trash2 className="h-4 w-4" />
                  </span>
                  Remove photo
                </button>
              )}
            </div>
            <div className="border-t border-[#f0f0f0] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:border-neutral-800">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full"
                onClick={() => setChooserOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type FormState = {
  productCode: string;
  name: string;
  categoryId: string;
  description: string;
  price: string;
  compareAtPrice: string;
  featured: boolean;
  specialOffer: boolean;
  offerEndsAt: string;
  offerHeadline: string;
  metalPurity: string;
  weightGram: string;
  stoneCarat: string;
  active: boolean;
  files: Partial<Record<SlotKey, File | null>>;
  previews: Partial<Record<SlotKey, string>>;
  offerFile: File | null;
  offerPreview?: string;
  clearOfferImage: boolean;
};

const emptyForm = (): FormState => ({
  productCode: '',
  name: '',
  categoryId: '',
  description: '',
  price: '',
  compareAtPrice: '',
  featured: false,
  specialOffer: false,
  offerEndsAt: '',
  offerHeadline: '',
  metalPurity: '',
  weightGram: '',
  stoneCarat: '',
  active: true,
  files: {},
  previews: {},
  offerFile: null,
  offerPreview: undefined,
  clearOfferImage: false,
});

function imageUrl(
  path: string | undefined,
  publicCode?: string,
  slot?: SlotKey | 'offer',
  cacheKey?: string
): string | null {
  let url: string | null = null;
  if (publicCode && slot) {
    // Same-origin proxy — works for localhost and 127.0.0.1
    url = `/api/public/products/${publicCode}/images/${slot}`;
  } else if (path) {
    if (path.startsWith('http')) url = path;
    else if (path.startsWith('/public/')) url = `/api${path}`;
    else url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  }
  if (!url) return null;
  if (cacheKey) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}v=${encodeURIComponent(cacheKey)}`;
  }
  return url;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<ProductCategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [qrOpen, setQrOpen] = useState(false);
  const [qrProduct, setQrProduct] = useState<ProductResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const [catOpen, setCatOpen] = useState(false);
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState('');
  const [catEditId, setCatEditId] = useState<number | null>(null);
  const [catName, setCatName] = useState('');
  const [catActive, setCatActive] = useState(true);

  const [q, setQ] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [specialFilter, setSpecialFilter] = useState<FlagFilter>('all');
  const [featuredFilter, setFeaturedFilter] = useState<FlagFilter>('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [p, c] = await Promise.all([
        api.get<ApiResponse<ProductResponse[]>>('/products'),
        api.get<ApiResponse<ProductCategoryResponse[]>>('/product-categories'),
      ]);
      setProducts(p.data.data);
      setCategories(c.data.data);
    } catch {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.active),
    [categories]
  );

  const filteredProducts = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== 'all' && String(p.categoryId) !== categoryFilter) return false;
      if (statusFilter === 'active' && !p.active) return false;
      if (statusFilter === 'inactive' && p.active) return false;
      if (specialFilter === 'yes' && !p.specialOffer) return false;
      if (specialFilter === 'no' && p.specialOffer) return false;
      if (featuredFilter === 'yes' && !p.featured) return false;
      if (featuredFilter === 'no' && p.featured) return false;
      if (priceFilter === 'priced' && p.price == null) return false;
      if (priceFilter === 'inquiry' && p.price != null) return false;
      if (
        priceFilter === 'discount' &&
        !(p.price != null && p.compareAtPrice != null && p.compareAtPrice > p.price)
      ) {
        return false;
      }
      if (query) {
        const hay = `${p.name} ${p.productCode} ${p.category} ${p.description || ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [
    products,
    q,
    categoryFilter,
    statusFilter,
    specialFilter,
    featuredFilter,
    priceFilter,
  ]);

  const filtersActive =
    q.trim() !== '' ||
    categoryFilter !== 'all' ||
    statusFilter !== 'all' ||
    specialFilter !== 'all' ||
    featuredFilter !== 'all' ||
    priceFilter !== 'all';

  function clearFilters() {
    setQ('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setSpecialFilter('all');
    setFeaturedFilter('all');
    setPriceFilter('all');
  }

  function openCreate() {
    setEditId(null);
    const first = activeCategories[0];
    setForm({ ...emptyForm(), categoryId: first ? String(first.id) : '' });
    setOpen(true);
  }

  function openEdit(p: ProductResponse) {
    setEditId(p.id);
    setForm({
      productCode: p.productCode,
      name: p.name,
      categoryId: String(p.categoryId),
      description: p.description || '',
      price: p.price != null ? String(p.price) : '',
      compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : '',
      featured: !!p.featured,
      specialOffer: !!p.specialOffer,
      offerEndsAt: p.offerEndsAt ? toDatetimeLocal(p.offerEndsAt) : '',
      offerHeadline: p.offerHeadline || '',
      metalPurity: p.metalPurity || '',
      weightGram: p.weightGram != null ? String(p.weightGram) : '',
      stoneCarat: p.stoneCarat != null ? String(p.stoneCarat) : '',
      active: p.active,
      files: {},
      previews: {
        front: p.images.front
          ? imageUrl(p.images.front, p.publicCode, 'front', p.updatedAt) || undefined
          : undefined,
        back: p.images.back
          ? imageUrl(p.images.back, p.publicCode, 'back', p.updatedAt) || undefined
          : undefined,
        side: p.images.side
          ? imageUrl(p.images.side, p.publicCode, 'side', p.updatedAt) || undefined
          : undefined,
        other: p.images.other
          ? imageUrl(p.images.other, p.publicCode, 'other', p.updatedAt) || undefined
          : undefined,
      },
      offerFile: null,
      offerPreview: p.images.offer
        ? imageUrl(p.images.offer, p.publicCode, 'offer', p.updatedAt) || undefined
        : undefined,
      clearOfferImage: false,
    });
    setOpen(true);
  }

  function onPick(slot: SlotKey, file: File | null) {
    if (!file) {
      setForm((f) => {
        const nextPreviews = { ...f.previews };
        delete nextPreviews[slot];
        return { ...f, files: { ...f.files, [slot]: null }, previews: nextPreviews };
      });
      return;
    }
    void (async () => {
      try {
        const prepared = await prepareShopImage(file);
        setForm((f) => {
          const nextPreviews = { ...f.previews };
          if (nextPreviews[slot]?.startsWith('blob:')) URL.revokeObjectURL(nextPreviews[slot]!);
          nextPreviews[slot] = URL.createObjectURL(prepared);
          return { ...f, files: { ...f.files, [slot]: prepared }, previews: nextPreviews };
        });
      } catch {
        setError('Could not process image — use JPEG, PNG, WebP, or GIF');
      }
    })();
  }

  function onPickOffer(file: File | null) {
    if (!file) {
      setForm((f) => {
        if (f.offerPreview?.startsWith('blob:')) URL.revokeObjectURL(f.offerPreview);
        return {
          ...f,
          offerFile: null,
          offerPreview: undefined,
          clearOfferImage: true,
        };
      });
      return;
    }
    void (async () => {
      try {
        const prepared = await prepareOfferImage(file);
        setForm((f) => {
          if (f.offerPreview?.startsWith('blob:')) URL.revokeObjectURL(f.offerPreview);
          return {
            ...f,
            offerFile: prepared,
            offerPreview: URL.createObjectURL(prepared),
            clearOfferImage: false,
          };
        });
      } catch {
        setError('Could not process offer image — use JPEG, PNG, WebP, or GIF');
      }
    })();
  }

  async function save() {
    if (!form.productCode.trim() || !form.name.trim() || !form.categoryId) {
      setError('Product Code, product name, and category are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('productCode', form.productCode.trim());
      fd.append('name', form.name.trim());
      fd.append('categoryId', form.categoryId);
      if (form.description.trim()) fd.append('description', form.description.trim());
      fd.append('price', form.price.trim());
      fd.append('compareAtPrice', form.compareAtPrice.trim());
      fd.append('featured', String(form.featured));
      fd.append('specialOffer', String(form.specialOffer));
      fd.append('offerEndsAt', form.specialOffer ? form.offerEndsAt.trim() : '');
      fd.append('offerHeadline', form.specialOffer ? form.offerHeadline.trim() : '');
      fd.append('metalPurity', form.metalPurity.trim());
      fd.append('weightGram', form.weightGram.trim());
      fd.append('stoneCarat', form.stoneCarat.trim());
      if (editId != null) fd.append('active', String(form.active));
      for (const slot of PRODUCT_IMAGE_SLOTS) {
        const file = form.files[slot.key];
        if (file) fd.append(slot.param, file);
      }
      if (form.offerFile) fd.append('imageOffer', form.offerFile);
      if (editId != null && form.clearOfferImage && !form.offerFile) {
        fd.append('clearOfferImage', 'true');
      }
      if (editId == null) await api.post('/products', fd);
      else await api.put(`/products/${editId}`, fd);
      setOpen(false);
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Save failed';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      await load();
    } catch {
      setError('Delete failed');
    }
  }

  async function showQr(p: ProductResponse) {
    setQrProduct(p);
    setQrOpen(true);
    const url = p.publicUrl || `${window.location.origin}/p/${p.publicCode}`;
    setQrDataUrl(
      await QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        color: { dark: '#001529', light: '#ffffff' },
      })
    );
  }

  function openCatCreate() {
    setCatEditId(null);
    setCatName('');
    setCatActive(true);
    setCatError('');
    setCatOpen(true);
  }

  function openCatEdit(c: ProductCategoryResponse) {
    setCatEditId(c.id);
    setCatName(c.name);
    setCatActive(c.active);
    setCatError('');
    setCatOpen(true);
  }

  async function saveCategory() {
    if (!catName.trim()) {
      setCatError('Category name is required');
      return;
    }
    setCatSaving(true);
    setCatError('');
    try {
      const body = { name: catName.trim(), active: catActive, sortOrder: null };
      if (catEditId == null) await api.post('/product-categories', body);
      else await api.put(`/product-categories/${catEditId}`, body);
      setCatOpen(false);
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Save failed';
      setCatError(msg);
    } finally {
      setCatSaving(false);
    }
  }

  async function deleteCategory(c: ProductCategoryResponse) {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    try {
      await api.delete(`/product-categories/${c.id}`);
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Delete failed';
      setError(msg);
    }
  }

  const categorySelectOptions = useMemo(() => {
    const map = new Map<number, ProductCategoryResponse>();
    activeCategories.forEach((c) => map.set(c.id, c));
    if (form.categoryId) {
      const selected = categories.find((c) => String(c.id) === form.categoryId);
      if (selected) map.set(selected.id, selected);
    }
    return Array.from(map.values());
  }, [activeCategories, categories, form.categoryId]);

  const selectedCategoryName =
    categorySelectOptions.find((c) => String(c.id) === form.categoryId)?.name || '';
  const specLabels = adminSpecLabels(selectedCategoryName);
  const productKind = jewelleryKind(selectedCategoryName);
  const filledPhotoCount = PRODUCT_IMAGE_SLOTS.filter(
    (s) => form.previews[s.key] || form.files[s.key]
  ).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f5f5f5] dark:bg-neutral-950">
      {/* Desktop header */}
      <div className="hidden shrink-0 items-center justify-between gap-3 border-b border-[#f0f0f0] bg-white px-5 py-3 dark:border-neutral-800 dark:bg-neutral-900 md:flex">
        <div>
          <h1 className="text-base font-medium text-[#262626] dark:text-neutral-100">Products</h1>
          <p className="text-xs text-[#8c8c8c]">
            Product catalog with categories and QR public pages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open('/shop', '_blank')}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Shop
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={openCatCreate}>
            <Tags className="h-3.5 w-3.5" />
            Categories
          </Button>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            New Product
          </Button>
        </div>
      </div>

      {/* Mobile toolbar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[#f0f0f0] bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900 md:hidden">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8c8c8c]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="h-9 pl-8 text-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn('h-9 w-9 shrink-0', (filtersOpen || filtersActive) && 'border-primary text-primary')}
          onClick={() => setFiltersOpen((o) => !o)}
          aria-label="Filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={openCatCreate} aria-label="Categories">
          <Tags className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" className="h-9 w-9 shrink-0" onClick={openCreate} aria-label="New product">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {error && !open && <p className="px-4 pt-2 text-sm text-red-600 sm:px-5">{error}</p>}

      {/* Category chips — tap to filter; edit/delete desktop only */}
      <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-[#f0f0f0] bg-white px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] dark:border-neutral-800 dark:bg-neutral-900 sm:flex-wrap sm:px-5 sm:py-2.5 [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={cn(
            'shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium',
            categoryFilter === 'all'
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-[#e8e8e8] text-[#595959] dark:border-neutral-700'
          )}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() =>
              setCategoryFilter(categoryFilter === String(c.id) ? 'all' : String(c.id))
            }
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition',
              categoryFilter === String(c.id)
                ? 'border-primary bg-primary/5 text-primary'
                : c.active
                  ? 'border-[#e8e8e8] bg-white text-[#262626] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
                  : 'border-dashed border-[#d9d9d9] text-[#8c8c8c]'
            )}
          >
            {c.name}
            <span className="text-[#bfbfbf]">({c.productCount})</span>
            <span
              role="button"
              tabIndex={0}
              className="ml-0.5 hidden text-[#8c8c8c] hover:text-primary sm:inline"
              onClick={(e) => {
                e.stopPropagation();
                openCatEdit(c);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  openCatEdit(c);
                }
              }}
              aria-label={`Edit ${c.name}`}
            >
              <Pencil className="h-3 w-3" />
            </span>
            <span
              role="button"
              tabIndex={0}
              className="hidden text-[#8c8c8c] hover:text-red-600 sm:inline"
              onClick={(e) => {
                e.stopPropagation();
                void deleteCategory(c);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  void deleteCategory(c);
                }
              }}
              aria-label={`Delete ${c.name}`}
            >
              <Trash2 className="h-3 w-3" />
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={openCatCreate}
          className="hidden shrink-0 rounded-full border border-dashed border-[#d9d9d9] px-2.5 py-1 text-xs text-[#8c8c8c] hover:border-primary hover:text-primary sm:inline"
        >
          + Add
        </button>
      </div>

      {/* Filters — always on desktop; toggle on mobile */}
      <div
        className={cn(
          'shrink-0 space-y-2.5 border-b border-[#f0f0f0] bg-white px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900 sm:px-5',
          filtersOpen ? 'block' : 'hidden md:block'
        )}
      >
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8c8c8c]" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, code…"
              className="h-8 pl-8 text-sm"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={specialFilter}
            onValueChange={(v) => setSpecialFilter(v as FlagFilter)}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Special" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Special: All</SelectItem>
              <SelectItem value="yes">Special Offer</SelectItem>
              <SelectItem value="no">Not special</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={featuredFilter}
            onValueChange={(v) => setFeaturedFilter(v as FlagFilter)}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Featured" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Featured: All</SelectItem>
              <SelectItem value="yes">Featured</SelectItem>
              <SelectItem value="no">Not featured</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={priceFilter}
            onValueChange={(v) => setPriceFilter(v as PriceFilter)}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Price: All</SelectItem>
              <SelectItem value="priced">Has price</SelectItem>
              <SelectItem value="inquiry">Price on inquiry</SelectItem>
              <SelectItem value="discount">On discount</SelectItem>
            </SelectContent>
          </Select>

          {filtersActive && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-[#8c8c8c]"
              onClick={clearFilters}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => window.open('/shop', '_blank')}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Shop
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'yes', label: 'Special' },
            ] as const
          ).map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setSpecialFilter(chip.key)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                specialFilter === chip.key
                  ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                  : 'border-[#e8e8e8] bg-white text-[#595959] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
              )}
            >
              {chip.label}
              {chip.key === 'yes' && (
                <span className="ml-1 text-[10px] opacity-70">
                  ({products.filter((p) => p.specialOffer).length})
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              setFeaturedFilter(featuredFilter === 'yes' ? 'all' : 'yes')
            }
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
              featuredFilter === 'yes'
                ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                : 'border-[#e8e8e8] bg-white text-[#595959] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
            )}
          >
            Featured
            <span className="ml-1 text-[10px] opacity-70">
              ({products.filter((p) => p.featured).length})
            </span>
          </button>
          <button
            type="button"
            onClick={() =>
              setPriceFilter(priceFilter === 'inquiry' ? 'all' : 'inquiry')
            }
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
              priceFilter === 'inquiry'
                ? 'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300'
                : 'border-[#e8e8e8] bg-white text-[#595959] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
            )}
          >
            Inquiry
          </button>
          <button
            type="button"
            onClick={() =>
              setPriceFilter(priceFilter === 'discount' ? 'all' : 'discount')
            }
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
              priceFilter === 'discount'
                ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300'
                : 'border-[#e8e8e8] bg-white text-[#595959] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
            )}
          >
            Discount
          </button>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="h-7 w-auto min-w-[5.5rem] rounded-full border-[#e8e8e8] px-2.5 text-[11px] md:hidden">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {filtersActive && (
            <button
              type="button"
              className="rounded-full px-2 py-1 text-[11px] text-[#8c8c8c] md:hidden"
              onClick={clearFilters}
            >
              Clear
            </button>
          )}
          <span className="ml-auto text-[11px] text-[#8c8c8c]">
            {filteredProducts.length}/{products.length}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-[#8c8c8c]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d9d9d9] bg-white py-16 text-center dark:border-neutral-700 dark:bg-neutral-900">
            <p className="text-sm text-[#8c8c8c]">No products yet</p>
            <Button type="button" className="mt-4" size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              Create first product
            </Button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d9d9d9] bg-white py-16 text-center dark:border-neutral-700 dark:bg-neutral-900">
            <p className="text-sm text-[#8c8c8c]">No products match these filters</p>
            <Button type="button" className="mt-4" size="sm" variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((p) => {
              const coverSlot = (['front', 'back', 'side', 'other'] as SlotKey[]).find(
                (s) => p.images[s]
              );
              const cover = coverSlot
                ? imageUrl(p.images[coverSlot], p.publicCode, coverSlot, p.updatedAt)
                : null;
              return (
                <article
                  key={p.id}
                  className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="relative aspect-square bg-[#fafafa] dark:bg-neutral-950 sm:aspect-[4/3]">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={p.name} className="h-full w-full object-cover sm:object-contain" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#d9d9d9]">
                        <ImagePlus className="h-8 w-8 sm:h-10 sm:w-10" />
                      </div>
                    )}
                    {!p.active && (
                      <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 p-2.5 sm:space-y-2 sm:p-3">
                    <div>
                      <p className="text-[10px] font-medium text-primary sm:text-[11px]">{p.productCode}</p>
                      <h3 className="line-clamp-2 text-xs font-medium text-[#262626] dark:text-neutral-100 sm:truncate sm:text-sm">
                        {p.name}
                      </h3>
                      <p className="truncate text-[11px] text-[#8c8c8c]">{p.category}</p>
                      <p className="mt-1 text-xs font-semibold text-primary sm:text-sm sm:font-medium">
                        {p.price != null ? `${formatCurrency(p.price)}` : 'Inquiry'}
                        {p.compareAtPrice != null &&
                          p.price != null &&
                          p.compareAtPrice > p.price && (
                            <span className="ml-1 text-[10px] font-normal text-rose-500 line-through sm:text-xs">
                              {formatCurrency(p.compareAtPrice)}
                            </span>
                          )}
                      </p>
                      {p.featured && (
                        <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-amber-600">
                          Featured
                        </p>
                      )}
                      {p.specialOffer && (
                        <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-rose-600">
                          Special Offer
                          {p.offerEndsAt ? ` · ends ${formatDateTime(p.offerEndsAt)}` : ''}
                        </p>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-[#595959] dark:text-neutral-400">
                      {p.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-1 pt-1">
                      <Button type="button" variant="outline" size="sm" className="h-7 px-2" onClick={() => showQr(p)}>
                        <QrCode className="h-3.5 w-3.5" />
                        QR
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-7 px-2" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => window.open(`/p/${p.publicCode}`, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-auto h-7 px-2 text-red-600"
                        onClick={() => remove(p.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-[#bfbfbf]">{formatDateTime(p.updatedAt)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Product dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId == null ? 'New Product' : 'Edit Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="pcode">
                Product Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pcode"
                value={form.productCode}
                onChange={(e) => setForm((f) => ({ ...f, productCode: e.target.value }))}
                placeholder="e.g. GD-0001"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pname">
                Product Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pname"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Enter product name"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>
                  Category <span className="text-red-500">*</span>
                </Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={openCatCreate}
                >
                  Manage categories
                </button>
              </div>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categorySelectOptions.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                      {!c.active ? ' (inactive)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pprice">Sale Price (MMK)</Label>
              <Input
                id="pprice"
                type="number"
                min={0}
                step="1"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="Leave empty for Price on inquiry"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pcompare">Original / Compare-at Price (MMK)</Label>
              <Input
                id="pcompare"
                type="number"
                min={0}
                step="1"
                value={form.compareAtPrice}
                onChange={(e) => setForm((f) => ({ ...f, compareAtPrice: e.target.value }))}
                placeholder="Higher than sale → Special discount %"
              />
              <p className="text-[11px] text-[#8c8c8c]">
                Example: Original 3,500,000 · Sale 2,850,000 → Special -19%
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="purity">{specLabels.purity}</Label>
                <Input
                  id="purity"
                  value={form.metalPurity}
                  onChange={(e) => setForm((f) => ({ ...f, metalPurity: e.target.value }))}
                  placeholder={specLabels.purityPlaceholder}
                />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm text-[#595959]">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                />
                Featured on shop
              </label>
            </div>

            <JewelleryWeightFields
              kind={productKind}
              weightGram={form.weightGram}
              stoneCarat={form.stoneCarat}
              onWeightGram={(v) => setForm((f) => ({ ...f, weightGram: v }))}
              onStoneCarat={(v) => setForm((f) => ({ ...f, stoneCarat: v }))}
            />

            {productKind === 'gold' && (
              <div className="space-y-1.5">
                <Label htmlFor="goldStone">Stone (ct) — optional</Label>
                <Input
                  id="goldStone"
                  type="number"
                  min={0}
                  step="0.001"
                  value={form.stoneCarat}
                  onChange={(e) => setForm((f) => ({ ...f, stoneCarat: e.target.value }))}
                  placeholder="If gold piece has diamonds / stones"
                />
              </div>
            )}

            <div className="space-y-3 rounded border border-[#f0f0f0] bg-[#fafafa] p-3 dark:border-neutral-800 dark:bg-neutral-950">
              <label className="flex items-center gap-2 text-sm text-[#595959]">
                <input
                  type="checkbox"
                  checked={form.specialOffer}
                  onChange={(e) => setForm((f) => ({ ...f, specialOffer: e.target.checked }))}
                />
                Limited Time / Special Offer
              </label>
              {form.specialOffer && (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="offerHeadline">Offer headline</Label>
                      <Input
                        id="offerHeadline"
                        value={form.offerHeadline}
                        onChange={(e) => setForm((f) => ({ ...f, offerHeadline: e.target.value }))}
                        placeholder="Limited Time Offer"
                        maxLength={80}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="offerEndsAt">Ends at</Label>
                      <Input
                        id="offerEndsAt"
                        type="datetime-local"
                        value={form.offerEndsAt}
                        onChange={(e) => setForm((f) => ({ ...f, offerEndsAt: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Offer banner{' '}
                      <span className="font-normal text-[#8c8c8c]">
                        (separate from gallery · 4:5 full-bleed)
                      </span>
                    </Label>
                    <div className="mx-auto w-full max-w-[200px] sm:mx-0">
                      <ProductPhotoSlot
                        label="Offer"
                        preview={form.offerPreview}
                        onPick={onPickOffer}
                        onClear={() => onPickOffer(null)}
                        aspectClass="aspect-[4/5]"
                        objectClass="object-cover"
                        hint="1200×1500"
                      />
                    </div>
                    <div className="rounded-lg border border-[#e6f4ff] bg-[#f0f7ff] px-3 py-2.5 text-[11px] leading-relaxed text-[#595959] dark:border-blue-950 dark:bg-blue-950/30 dark:text-neutral-300">
                      <p className="font-medium text-[#1677ff] dark:text-blue-300">Offer image size</p>
                      <ul className="mt-1.5 list-inside list-disc space-y-0.5">
                        {offerImageSizeGuide().map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[#8c8c8c]">{offerImageHint()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>
                  Photos <span className="text-[#8c8c8c]">(Front, Back, Side, Other)</span>
                </Label>
                <span className="text-[11px] text-[#8c8c8c]">{filledPhotoCount}/4 filled</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {PRODUCT_IMAGE_SLOTS.map((slot) => (
                  <ProductPhotoSlot
                    key={slot.key}
                    label={slot.label}
                    preview={form.previews[slot.key]}
                    onPick={(file) => onPick(slot.key, file)}
                    onClear={() => onPick(slot.key, null)}
                  />
                ))}
              </div>
              <div className="rounded-lg border border-[#f0f0f0] bg-[#fafafa] px-3 py-2.5 text-[11px] leading-relaxed text-[#8c8c8c] dark:border-neutral-800 dark:bg-neutral-950">
                <p className="font-medium text-[#595959] dark:text-neutral-300">Image sizes</p>
                <ul className="mt-1.5 list-inside list-disc space-y-0.5">
                  {shopImageSizeGuide().map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-2">{shopImageHint()}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pdesc">Description</Label>
              <Textarea
                id="pdesc"
                rows={4}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Product details…"
              />
            </div>

            {editId != null && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
                Active (visible via QR)
              </label>
            )}

            {error && open && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editId == null ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category dialog */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{catEditId == null ? 'Add Category' : 'Edit Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="cname">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cname"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Diamond, Gold, PT…"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={catActive}
                onChange={(e) => setCatActive(e.target.checked)}
              />
              Active
            </label>
            {catError && <p className="text-sm text-red-600">{catError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCatOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveCategory} disabled={catSaving}>
              {catSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Product QR</DialogTitle>
          </DialogHeader>
          {qrProduct && (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-center text-xs text-primary">{qrProduct.productCode}</p>
              <p className="text-center text-sm font-medium">{qrProduct.name}</p>
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="QR code" className="rounded border border-[#f0f0f0]" />
              )}
              <p className="break-all text-center text-[11px] text-[#8c8c8c]">
                {qrProduct.publicUrl}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = qrDataUrl;
                    a.download = `product-qr-${qrProduct.productCode || qrProduct.publicCode}.png`;
                    a.click();
                  }}
                >
                  Download QR
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => window.open(`/p/${qrProduct.publicCode}`, '_blank')}
                >
                  Open public page
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
