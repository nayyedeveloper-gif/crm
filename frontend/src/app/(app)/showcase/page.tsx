'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { CRM_PERMISSION_KEYS, usePermissionStore } from '@/lib/permission-store';
import type {
  ApiResponse,
  ProductCategoryResponse,
  ShowcaseBranchSummary,
  ShowcaseItemResponse,
  ShowcaseSubcategoryResponse,
  ShowcaseSummaryResponse,
} from '@/types';
import { jewelleryKind, jewellerySpecRows, adminSpecLabels } from '@/lib/jewellery-specs';
import { JewelleryWeightFields } from '@/components/products/jewellery-weight-fields';
import { AuthImage, fetchAuthImageBlob, useAuthImageSrc } from '@/components/auth-image';
import { ImageCropRotateDialog, normalizeImageFile } from '@/components/image-crop-rotate-dialog';
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
  Trash2,
  ImagePlus,
  Search,
  Camera,
  Images,
  LayoutGrid,
  Eye,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Tags,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_PHOTOS = 12;

function formatMmk(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return new Intl.NumberFormat('en-US').format(value);
}

function purityOptionsFor(kind: ReturnType<typeof jewelleryKind>): string[] {
  if (kind === 'diamond') return ['18K', '22K', 'PT950', 'PT900'];
  if (kind === 'platinum') return ['PT950', 'PT900', 'PT850'];
  if (kind === 'gold') return ['၁၅ ပဲရည်', '၁၆ ပဲရည်', '18K', '22K', '24K'];
  return ['၁၅ ပဲရည်', '၁၆ ပဲရည်', '18K', '22K', 'PT950', 'Silver'];
}

type DraftPhoto = {
  key: string;
  preview: string;
  previewCacheKey?: string;
  file?: File;
  existingId?: number;
};

type FormState = {
  branchId: string;
  itemCode: string;
  name: string;
  categoryId: string;
  subcategoryId: string;
  description: string;
  priceMmk: string;
  metalPurity: string;
  weightGram: string;
  stoneCarat: string;
  active: boolean;
  photos: DraftPhoto[];
  removeImageIds: number[];
};

const emptyForm = (branchId = '', categoryId = ''): FormState => ({
  branchId,
  itemCode: '',
  name: '',
  categoryId,
  subcategoryId: '',
  description: '',
  priceMmk: '',
  metalPurity: '',
  weightGram: '',
  stoneCarat: '',
  active: true,
  photos: [],
  removeImageIds: [],
});

function requiresSubcategory(categoryName: string): boolean {
  return jewelleryKind(categoryName) !== 'other';
}

function ReqLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor}>
      {children} <span className="text-red-500">*</span>
    </Label>
  );
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadShowcasePhotos(
  item: ShowcaseItemResponse,
  imageIndex?: number
) {
  const targets =
    imageIndex != null
      ? [item.images[imageIndex]].filter(Boolean)
      : item.images;
  if (!targets.length) return;
  for (let i = 0; i < targets.length; i++) {
    const img = targets[i];
    const blob = await fetchAuthImageBlob(img.url, item.updatedAt);
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const suffix = targets.length > 1 ? `-${i + 1}` : '';
    triggerBlobDownload(blob, `${item.itemCode}${suffix}.${ext}`);
    if (targets.length > 1 && i < targets.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}

function PhotoSlot({
  preview,
  previewCacheKey,
  label,
  cover,
  onPick,
  onClear,
  onEdit,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  editing,
}: {
  preview?: string;
  previewCacheKey?: string;
  label: string;
  cover?: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
  onEdit?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  editing?: boolean;
}) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const resolvedPreview = useAuthImageSrc(preview, previewCacheKey);

  function handle(file: File | null) {
    setOpen(false);
    if (galleryRef.current) galleryRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
    if (file) onPick(file);
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#d9d9d9] bg-[#fafafa] dark:border-neutral-700 dark:bg-neutral-950"
        >
          {resolvedPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolvedPreview} alt={label} className="h-full w-full object-contain" />
          ) : (
            <>
              <ImagePlus className="h-5 w-5 text-[#bfbfbf]" />
              <span className="mt-1 text-[10px] text-[#8c8c8c]">{label}</span>
            </>
          )}
          {resolvedPreview && (
            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
              {cover ? 'Cover' : label}
            </span>
          )}
        </button>
        {resolvedPreview && (onMoveUp || onMoveDown) && (
          <div className="absolute top-1 right-1 flex flex-col gap-0.5">
            <button
              type="button"
              disabled={!canMoveUp}
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.();
              }}
              className="rounded bg-black/55 p-0.5 text-white disabled:opacity-30"
              aria-label="Move photo up"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={!canMoveDown}
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.();
              }}
              className="rounded bg-black/55 p-0.5 text-white disabled:opacity-30"
              aria-label="Move photo down"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0] || null)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0] || null)}
      />
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl bg-white shadow-xl dark:bg-neutral-900 sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[#f0f0f0] px-4 py-3 dark:border-neutral-800">
              <p className="font-semibold text-[#262626] dark:text-neutral-100">{label} photo</p>
            </div>
            <div className="flex flex-col p-2">
              {preview && onEdit && (
                <button
                  type="button"
                  className="flex min-h-12 items-center gap-3 rounded-lg px-3 py-3 text-sm"
                  disabled={editing}
                  onClick={() => {
                    setOpen(false);
                    onEdit();
                  }}
                >
                  {editing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Pencil className="h-4 w-4 text-primary" />
                  )}
                  Crop &amp; edit
                </button>
              )}
              <button
                type="button"
                className="flex min-h-12 items-center gap-3 rounded-lg px-3 py-3 text-sm"
                onClick={() => cameraRef.current?.click()}
              >
                <Camera className="h-4 w-4 text-primary" />
                Take photo
              </button>
              <button
                type="button"
                className="flex min-h-12 items-center gap-3 rounded-lg px-3 py-3 text-sm"
                onClick={() => galleryRef.current?.click()}
              >
                <Images className="h-4 w-4" />
                Choose from gallery
              </button>
              {preview && (
                <button
                  type="button"
                  className="flex min-h-12 items-center gap-3 rounded-lg px-3 py-3 text-sm text-red-600"
                  onClick={() => {
                    setOpen(false);
                    onClear();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove photo
                </button>
              )}
            </div>
            <div className="border-t p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:border-neutral-800">
              <Button type="button" variant="outline" className="h-10 w-full" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ShowcasePage() {
  const { user } = useAuthStore();
  const canBranchAll = usePermissionStore((s) => s.can(CRM_PERMISSION_KEYS.branchAll));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<ShowcaseItemResponse[]>([]);
  const [branches, setBranches] = useState<ShowcaseBranchSummary[]>([]);
  const [categories, setCategories] = useState<ProductCategoryResponse[]>([]);
  const [subcategories, setSubcategories] = useState<ShowcaseSubcategoryResponse[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [viewItem, setViewItem] = useState<ShowcaseItemResponse | null>(null);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [subOpen, setSubOpen] = useState(false);
  const [subCategoryFilter, setSubCategoryFilter] = useState('');
  const [subEditId, setSubEditId] = useState<number | null>(null);
  const [subName, setSubName] = useState('');
  const [subSaving, setSubSaving] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState('showcase.jpg');
  const [cropReplaceKey, setCropReplaceKey] = useState<string | null>(null);
  const [editingPhotoKey, setEditingPhotoKey] = useState<string | null>(null);

  const defaultBranchId = useMemo(() => {
    if (user?.branchId) return String(user.branchId);
    return branches[0] ? String(branches[0].branchId) : '';
  }, [user?.branchId, branches]);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.active),
    [categories]
  );

  const defaultCategoryId = useMemo(
    () => (activeCategories[0] ? String(activeCategories[0].id) : ''),
    [activeCategories]
  );

  const selectedCategoryName = useMemo(() => {
    const cat = categories.find((c) => String(c.id) === form.categoryId);
    return cat?.name || '';
  }, [categories, form.categoryId]);

  const formKind = useMemo(
    () => jewelleryKind(selectedCategoryName),
    [selectedCategoryName]
  );

  const specLabels = useMemo(
    () => adminSpecLabels(selectedCategoryName),
    [selectedCategoryName]
  );

  const formPurityOptions = useMemo(() => purityOptionsFor(formKind), [formKind]);

  const formNeedsSubcategory = requiresSubcategory(selectedCategoryName);

  const formSubcategories = useMemo(
    () =>
      subcategories.filter(
        (s) => s.active && String(s.categoryId) === form.categoryId
      ),
    [subcategories, form.categoryId]
  );

  const jewelleryCategories = useMemo(
    () => activeCategories.filter((c) => requiresSubcategory(c.name)),
    [activeCategories]
  );

  const loadSubcategories = useCallback(async () => {
    try {
      const { data } = await api.get<ApiResponse<ShowcaseSubcategoryResponse[]>>(
        '/showcase/subcategories',
        { params: { activeOnly: false } }
      );
      setSubcategories(data.data || []);
    } catch {
      setSubcategories([]);
    }
  }, []);

  useEffect(() => {
    void api
      .get<ApiResponse<ProductCategoryResponse[]>>('/product-categories')
      .then(({ data }) => setCategories(data.data || []))
      .catch(() => setCategories([]));
    void loadSubcategories();
  }, [loadSubcategories]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sumRes, listRes] = await Promise.all([
        api.get<ApiResponse<ShowcaseSummaryResponse>>('/showcase/summary'),
        api.get<ApiResponse<ShowcaseItemResponse[]>>('/showcase', {
          params: {
            branchId: branchFilter !== 'all' ? branchFilter : undefined,
            q: q.trim() || undefined,
          },
        }),
      ]);
      setBranches(sumRes.data.data?.branches || []);
      setTotalItems(sumRes.data.data?.totalItems || 0);
      setItems(listRes.data.data || []);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load Show Case';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [branchFilter, q]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm(defaultBranchId, defaultCategoryId));
    setOpen(true);
  }

  function openEdit(item: ShowcaseItemResponse) {
    setEditId(item.id);
    setForm({
      branchId: String(item.branchId),
      itemCode: item.itemCode,
      name: item.name,
      categoryId: item.categoryId != null ? String(item.categoryId) : defaultCategoryId,
      subcategoryId: item.subcategoryId != null ? String(item.subcategoryId) : '',
      description: item.description || '',
      priceMmk: item.priceMmk != null ? String(item.priceMmk) : '',
      metalPurity: item.metalPurity || '',
      weightGram: item.weightGram != null ? String(item.weightGram) : '',
      stoneCarat: item.stoneCarat != null ? String(item.stoneCarat) : '',
      active: item.active,
      photos: item.images.map((img) => ({
        key: `ex-${img.id}`,
        preview: img.url,
        previewCacheKey: item.updatedAt,
        existingId: img.id,
      })),
      removeImageIds: [],
    });
    setOpen(true);
  }

  function beginCrop(file: File, replaceKey: string | null = null) {
    if (file.type && !file.type.startsWith('image/')) {
      setError('Please choose an image file');
      return;
    }
    if (replaceKey == null && form.photos.length >= MAX_PHOTOS) {
      setError(`Maximum ${MAX_PHOTOS} photos`);
      return;
    }
    if (cropSrc?.startsWith('blob:')) URL.revokeObjectURL(cropSrc);
    const src = URL.createObjectURL(file);
    setCropSrc(src);
    setCropFileName(file.name || 'showcase.jpg');
    setCropReplaceKey(replaceKey);
    setCropOpen(true);
    setError('');
  }

  async function beginCropNormalized(input: Blob | File, replaceKey: string | null, fileName: string) {
    const normalized = await normalizeImageFile(input, fileName);
    beginCrop(normalized, replaceKey);
  }

  function applyCroppedPhoto(prepared: File) {
    const preview = URL.createObjectURL(prepared);
    if (cropReplaceKey) {
      const key = cropReplaceKey;
      setForm((f) => {
        const prev = f.photos.find((p) => p.key === key);
        if (prev?.preview.startsWith('blob:')) URL.revokeObjectURL(prev.preview);
        return {
          ...f,
          photos: f.photos.map((p) =>
            p.key === key
              ? {
                  ...p,
                  file: prepared,
                  preview,
                  existingId: undefined,
                  previewCacheKey: undefined,
                }
              : p
          ),
          removeImageIds:
            prev?.existingId != null ? [...f.removeImageIds, prev.existingId] : f.removeImageIds,
        };
      });
    } else {
      setForm((f) => ({
        ...f,
        photos: [
          ...f.photos,
          {
            key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            preview,
            file: prepared,
          },
        ],
      }));
    }
  }

  async function addPhoto(file: File) {
    setEditingPhotoKey('__new__');
    setError('');
    try {
      await beginCropNormalized(file, null, file.name || 'showcase.jpg');
    } catch {
      setError('Could not process image');
    } finally {
      setEditingPhotoKey(null);
    }
  }

  async function editExistingPhoto(photo: DraftPhoto) {
    setEditingPhotoKey(photo.key);
    setError('');
    try {
      let source: Blob | File;
      if (photo.file) {
        source = photo.file;
      } else if (photo.preview.startsWith('blob:') || photo.preview.startsWith('data:')) {
        const res = await fetch(photo.preview);
        source = await res.blob();
      } else {
        source = await fetchAuthImageBlob(photo.preview, photo.previewCacheKey);
      }
      await beginCropNormalized(source, photo.key, `photo-${photo.existingId ?? photo.key}.jpg`);
    } catch {
      setError('Existing photo ကို edit လုပ်ရန် မရပါ');
    } finally {
      setEditingPhotoKey(null);
    }
  }

  function clearPhoto(key: string) {
    setForm((f) => {
      const photo = f.photos.find((p) => p.key === key);
      if (photo?.preview.startsWith('blob:')) URL.revokeObjectURL(photo.preview);
      const removeImageIds =
        photo?.existingId != null ? [...f.removeImageIds, photo.existingId] : f.removeImageIds;
      return {
        ...f,
        photos: f.photos.filter((p) => p.key !== key),
        removeImageIds,
      };
    });
  }

  function movePhoto(key: string, direction: -1 | 1) {
    setForm((f) => {
      const idx = f.photos.findIndex((p) => p.key === key);
      if (idx < 0) return f;
      const next = idx + direction;
      if (next < 0 || next >= f.photos.length) return f;
      const photos = [...f.photos];
      const [moved] = photos.splice(idx, 1);
      photos.splice(next, 0, moved);
      return { ...f, photos };
    });
  }

  async function save() {
    if (!form.itemCode.trim() || !form.name.trim()) {
      setError('Code and name are required');
      return;
    }
    if (!form.categoryId) {
      setError('Category is required');
      return;
    }
    if (!form.description.trim()) {
      setError('Description is required');
      return;
    }
    if (form.photos.length === 0) {
      setError('At least one photo is required');
      return;
    }
    if (!form.branchId && canBranchAll) {
      setError('Branch / Shop is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      if (form.branchId) fd.append('branchId', form.branchId);
      fd.append('itemCode', form.itemCode.trim());
      fd.append('name', form.name.trim());
      fd.append('categoryId', form.categoryId);
      if (form.subcategoryId) fd.append('subcategoryId', form.subcategoryId);
      fd.append('description', form.description.trim());
      if (form.priceMmk.trim()) fd.append('priceMmk', form.priceMmk.trim());
      if (form.metalPurity.trim()) fd.append('metalPurity', form.metalPurity.trim());
      if (form.weightGram.trim()) fd.append('weightGram', form.weightGram.trim());
      if (form.stoneCarat.trim()) fd.append('stoneCarat', form.stoneCarat.trim());
      if (editId != null) fd.append('active', String(form.active));
      const sequence: string[] = [];
      for (const photo of form.photos) {
        if (photo.file) {
          fd.append('images', photo.file);
          sequence.push('new');
        } else if (photo.existingId != null) {
          sequence.push(String(photo.existingId));
        }
      }
      fd.append('photoSequence', sequence.join(','));
      if (editId != null && form.removeImageIds.length) {
        fd.append('removeImageIds', form.removeImageIds.join(','));
      }
      if (editId == null) await api.post('/showcase', fd);
      else await api.put(`/showcase/${editId}`, fd);
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

  async function handleDownload(item: ShowcaseItemResponse) {
    if (!item.images.length) return;
    setDownloading(item.id);
    setError('');
    try {
      await downloadShowcasePhotos(item);
    } catch {
      setError('Download failed');
    } finally {
      setDownloading(null);
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this Show Case item?')) return;
    try {
      await api.delete(`/showcase/${id}`);
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Delete failed';
      setError(msg);
    }
  }

  function openSubManage(categoryId?: string) {
    const initial =
      categoryId ||
      form.categoryId ||
      (jewelleryCategories[0] ? String(jewelleryCategories[0].id) : '');
    setSubCategoryFilter(initial);
    setSubEditId(null);
    setSubName('');
    setSubOpen(true);
  }

  function startSubEdit(sub: ShowcaseSubcategoryResponse) {
    setSubCategoryFilter(String(sub.categoryId));
    setSubEditId(sub.id);
    setSubName(sub.name);
  }

  async function saveSubcategory() {
    if (!subCategoryFilter) {
      setError('Select a category');
      return;
    }
    if (!subName.trim()) {
      setError('Sub category name is required');
      return;
    }
    setSubSaving(true);
    setError('');
    try {
      const body = {
        categoryId: Number(subCategoryFilter),
        name: subName.trim(),
        active: true,
      };
      if (subEditId == null) {
        await api.post('/showcase/subcategories', body);
      } else {
        await api.put(`/showcase/subcategories/${subEditId}`, body);
      }
      await loadSubcategories();
      setSubEditId(null);
      setSubName('');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Sub category save failed';
      setError(msg);
    } finally {
      setSubSaving(false);
    }
  }

  async function deleteSubcategory(id: number) {
    if (!confirm('Delete this sub category?')) return;
    setError('');
    try {
      await api.delete(`/showcase/subcategories/${id}`);
      await loadSubcategories();
      if (String(id) === form.subcategoryId) {
        setForm((f) => ({ ...f, subcategoryId: '' }));
      }
      if (subEditId === id) {
        setSubEditId(null);
        setSubName('');
      }
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Delete failed';
      setError(msg);
    }
  }

  const filteredSubcategories = useMemo(
    () =>
      subcategories.filter((s) => String(s.categoryId) === subCategoryFilter),
    [subcategories, subCategoryFilter]
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:p-5">
      <div className="hidden shrink-0 items-start justify-between gap-3 md:flex">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#262626] dark:text-neutral-100">
            Show Case
          </h1>
          <p className="mt-0.5 text-sm text-[#8c8c8c]">
            Branch / Shop inventory photos for operations · {totalItems} item
            {totalItems === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => openSubManage()}>
            <Tags className="h-3.5 w-3.5" />
            Sub categories
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Add item
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 gap-2 md:hidden">
        <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => void load()}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
        <Button type="button" className="h-10 flex-1" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add item
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setBranchFilter('all')}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs font-medium transition',
            branchFilter === 'all'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-[#e8e8e8] bg-white text-[#595959] dark:border-neutral-700 dark:bg-neutral-900'
          )}
        >
          All ({totalItems})
        </button>
        {branches.map((b) => (
          <button
            key={b.branchId}
            type="button"
            onClick={() => setBranchFilter(String(b.branchId))}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition',
              branchFilter === String(b.branchId)
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-[#e8e8e8] bg-white text-[#595959] dark:border-neutral-700 dark:bg-neutral-900'
            )}
          >
            {b.branchName} ({b.itemCount})
          </button>
        ))}
      </div>

      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#bfbfbf]" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search code or name…"
          className="h-10 pl-9"
        />
      </div>

      {error && !open && <p className="text-sm text-red-600">{error}</p>}

      {loading && items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[#8c8c8c]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#e8e8e8] bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <LayoutGrid className="h-8 w-8 text-[#d9d9d9]" />
          <p className="text-sm text-[#8c8c8c]">No Show Case items yet</p>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Add first item
          </Button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-[#e8e8e8] bg-white dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setViewItem(item);
                      setZoomIndex(null);
                    }}
                    className="aspect-square w-full bg-[#f5f5f5] dark:bg-neutral-950"
                  >
                    {item.images[0] ? (
                      <AuthImage
                        src={item.images[0].url}
                        cacheKey={item.updatedAt}
                        alt={item.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#d9d9d9]">
                        <ImagePlus className="h-8 w-8" />
                      </div>
                    )}
                  </button>
                  <div className="space-y-1.5 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#262626] dark:text-neutral-100">
                          {item.name}
                        </p>
                        <p className="font-mono text-xs text-[#8c8c8c]">{item.itemCode}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5">
                        <span className="rounded bg-[#f5f5f5] px-1.5 py-0.5 text-[10px] text-[#595959] dark:bg-neutral-800">
                          {item.branchName}
                        </span>
                        <span className="rounded bg-[#e6f4ff] px-1.5 py-0.5 text-[10px] text-primary">
                          {item.category}
                        </span>
                        {item.subCategory && (
                          <span className="rounded bg-[#f6ffed] px-1.5 py-0.5 text-[10px] text-[#389e0d]">
                            {item.subCategory}
                          </span>
                        )}
                      </div>
                    </div>
                    {(item.priceMmk != null ||
                      jewellerySpecRows(item).length > 0) && (
                      <p className="text-xs text-[#595959]">
                        {[
                          item.priceMmk != null ? `${formatMmk(item.priceMmk)} Ks` : null,
                          ...jewellerySpecRows(item).map((row) => row.value),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    {item.description && (
                      <p className="line-clamp-2 text-xs text-[#8c8c8c]">{item.description}</p>
                    )}
                    <p className="text-xs text-[#595959]">
                      {item.images.length} photo{item.images.length === 1 ? '' : 's'}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          setViewItem(item);
                          setZoomIndex(null);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        disabled={!item.images.length || downloading === item.id}
                        onClick={() => void handleDownload(item)}
                      >
                        {downloading === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        Download
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-red-600"
                        onClick={() => void remove(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId == null ? 'Add Show Case item' : 'Edit Show Case item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {canBranchAll && (
              <div className="space-y-1.5">
                <Label>Branch / Shop</Label>
                <Select
                  value={form.branchId}
                  onValueChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.branchId} value={String(b.branchId)}>
                        {b.branchName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <ReqLabel htmlFor="sc-code">Code</ReqLabel>
                <Input
                  id="sc-code"
                  value={form.itemCode}
                  onChange={(e) => setForm((f) => ({ ...f, itemCode: e.target.value }))}
                  placeholder="SC-0001"
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <ReqLabel htmlFor="sc-name">Name</ReqLabel>
                <Input
                  id="sc-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Item name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <ReqLabel>Category</ReqLabel>
              <Select
                value={form.categoryId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, categoryId: v, subcategoryId: '' }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {activeCategories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formNeedsSubcategory && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>
                    Sub category{' '}
                    <span className="font-normal text-[#8c8c8c]">(optional)</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => openSubManage(form.categoryId)}
                  >
                    <Plus className="h-3 w-3" />
                    Manage
                  </Button>
                </div>
                <Select
                  value={form.subcategoryId || '__none__'}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, subcategoryId: v === '__none__' ? '' : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {formSubcategories.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formSubcategories.length === 0 && (
                  <p className="text-[11px] text-[#8c8c8c]">
                    No sub categories yet — tap Manage to add one.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <ReqLabel htmlFor="sc-desc">Description</ReqLabel>
              <Textarea
                id="sc-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Item details, notes…"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sc-price">Price (MMK)</Label>
                <Input
                  id="sc-price"
                  inputMode="decimal"
                  value={form.priceMmk}
                  onChange={(e) => setForm((f) => ({ ...f, priceMmk: e.target.value }))}
                  placeholder="e.g. 2500000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{specLabels.purity}</Label>
                <Select
                  value={form.metalPurity || '__none__'}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, metalPurity: v === '__none__' ? '' : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={specLabels.purityPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {formPurityOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                    {form.metalPurity && !formPurityOptions.includes(form.metalPurity) && (
                      <SelectItem value={form.metalPurity}>{form.metalPurity}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <JewelleryWeightFields
              kind={formKind}
              weightGram={form.weightGram}
              stoneCarat={form.stoneCarat}
              onWeightGram={(v) => setForm((f) => ({ ...f, weightGram: v }))}
              onStoneCarat={(v) => setForm((f) => ({ ...f, stoneCarat: v }))}
            />

            {formKind === 'gold' && (
              <div className="space-y-1.5">
                <Label htmlFor="sc-gold-stone">Stone (ct) — optional</Label>
                <Input
                  id="sc-gold-stone"
                  type="number"
                  min={0}
                  step="0.001"
                  value={form.stoneCarat}
                  onChange={(e) => setForm((f) => ({ ...f, stoneCarat: e.target.value }))}
                  placeholder="If gold piece has diamonds / stones"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <ReqLabel>
                  Photos{' '}
                  <span className="font-normal text-[#8c8c8c]">
                    ({form.photos.length}/{MAX_PHOTOS})
                  </span>
                </ReqLabel>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {form.photos.map((photo, idx) => (
                  <PhotoSlot
                    key={photo.key}
                    label={`Photo ${idx + 1}`}
                    cover={idx === 0}
                    preview={photo.preview}
                    previewCacheKey={photo.previewCacheKey}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < form.photos.length - 1}
                    onMoveUp={() => movePhoto(photo.key, -1)}
                    onMoveDown={() => movePhoto(photo.key, 1)}
                    onPick={(file) => {
                      void (async () => {
                        setEditingPhotoKey(photo.key);
                        try {
                          await beginCropNormalized(file, photo.key, file.name || 'showcase.jpg');
                        } catch {
                          setError('Could not process image');
                        } finally {
                          setEditingPhotoKey(null);
                        }
                      })();
                    }}
                    onEdit={() => void editExistingPhoto(photo)}
                    editing={editingPhotoKey === photo.key}
                    onClear={() => clearPhoto(photo.key)}
                  />
                ))}
                {form.photos.length < MAX_PHOTOS && (
                  <PhotoSlot
                    label="Add"
                    onPick={(file) => void addPhoto(file)}
                    onClear={() => undefined}
                  />
                )}
              </div>
              <p className="text-[11px] text-[#8c8c8c]">
                First photo is the cover · use arrows to reorder · tap photo for Adjust / Filters / Crop · up to{' '}
                {MAX_PHOTOS} photos
              </p>
            </div>

            {editId != null && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
                Active
              </label>
            )}

            {error && open && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={subOpen} onOpenChange={setSubOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sub categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={subCategoryFilter} onValueChange={setSubCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Diamond / Gold / PT" />
                </SelectTrigger>
                <SelectContent>
                  {jewelleryCategories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Input
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                placeholder="Sub category name"
                className="flex-1"
              />
              <Button type="button" onClick={() => void saveSubcategory()} disabled={subSaving}>
                {subSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {subEditId == null ? 'Add' : 'Update'}
              </Button>
              {subEditId != null && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSubEditId(null);
                    setSubName('');
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>

            <div className="max-h-64 overflow-auto rounded-lg border border-[#e8e8e8] dark:border-neutral-800">
              {filteredSubcategories.length === 0 ? (
                <p className="p-4 text-center text-sm text-[#8c8c8c]">No sub categories yet</p>
              ) : (
                <ul className="divide-y divide-[#f0f0f0] dark:divide-neutral-800">
                  {filteredSubcategories.map((sub) => (
                    <li
                      key={sub.id}
                      className="flex items-center justify-between gap-2 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{sub.name}</p>
                        <p className="text-[11px] text-[#8c8c8c]">
                          {sub.itemCount} item{sub.itemCount === 1 ? '' : 's'}
                          {!sub.active && ' · inactive'}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 px-0"
                          onClick={() => startSubEdit(sub)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 px-0 text-red-600"
                          onClick={() => void deleteSubcategory(sub.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && subOpen && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setSubOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={viewItem != null}
        onOpenChange={(v) => {
          if (!v) {
            setViewItem(null);
            setZoomIndex(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          {viewItem && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8">{viewItem.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-1">
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[#8c8c8c]">Code</dt>
                    <dd className="font-mono font-medium">{viewItem.itemCode}</dd>
                  </div>
                  <div>
                    <dt className="text-[#8c8c8c]">Category</dt>
                    <dd className="font-medium">{viewItem.category}</dd>
                  </div>
                  {viewItem.subCategory && (
                    <div>
                      <dt className="text-[#8c8c8c]">Sub category</dt>
                      <dd className="font-medium">{viewItem.subCategory}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-[#8c8c8c]">Branch / Shop</dt>
                    <dd className="font-medium">{viewItem.branchName}</dd>
                  </div>
                  {viewItem.priceMmk != null && (
                    <div>
                      <dt className="text-[#8c8c8c]">Price</dt>
                      <dd className="font-medium">{formatMmk(viewItem.priceMmk)} Ks</dd>
                    </div>
                  )}
                  {jewellerySpecRows(viewItem).map((row) => (
                    <div key={row.key}>
                      <dt className="text-[#8c8c8c]">{row.label}</dt>
                      <dd className={cn('font-medium', row.emphasize && 'text-[#262626]')}>
                        {row.value}
                      </dd>
                    </div>
                  ))}
                  <div>
                    <dt className="text-[#8c8c8c]">Photos</dt>
                    <dd className="font-medium">{viewItem.images.length}</dd>
                  </div>
                </dl>
                <div>
                  <p className="mb-1 text-sm text-[#8c8c8c]">Description</p>
                  <p className="whitespace-pre-wrap text-sm text-[#262626] dark:text-neutral-100">
                    {viewItem.description || '—'}
                  </p>
                </div>
                {viewItem.images.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Photos</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={downloading === viewItem.id}
                        onClick={() => void handleDownload(viewItem)}
                      >
                        {downloading === viewItem.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        Download all
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {viewItem.images.map((img, idx) => (
                        <div key={img.id} className="group relative overflow-hidden rounded-lg border border-[#e8e8e8] dark:border-neutral-800">
                          <button
                            type="button"
                            className="aspect-square w-full bg-[#f5f5f5] dark:bg-neutral-950"
                            onClick={() => setZoomIndex(idx)}
                          >
                            <AuthImage
                              src={img.url}
                              cacheKey={viewItem.updatedAt}
                              alt={`${viewItem.name} ${idx + 1}`}
                              className="h-full w-full object-contain"
                            />
                          </button>
                          <button
                            type="button"
                            className="absolute top-1 right-1 rounded bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                            title="Download"
                            onClick={() =>
                              void downloadShowcasePhotos(viewItem, idx).catch(() =>
                                setError('Download failed')
                              )
                            }
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#8c8c8c]">No photos</p>
                )}
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button type="button" variant="outline" onClick={() => openEdit(viewItem)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button type="button" onClick={() => setViewItem(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {viewItem && zoomIndex != null && viewItem.images[zoomIndex] && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomIndex(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white"
            onClick={() => setZoomIndex(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {viewItem.images.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-3 rounded-full bg-white/10 p-2 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomIndex((i) =>
                    i == null ? 0 : (i - 1 + viewItem.images.length) % viewItem.images.length
                  );
                }}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                className="absolute right-3 rounded-full bg-white/10 p-2 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomIndex((i) =>
                    i == null ? 0 : (i + 1) % viewItem.images.length
                  );
                }}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <div
            className="max-h-[85vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <AuthImage
              src={viewItem.images[zoomIndex].url}
              cacheKey={viewItem.updatedAt}
              alt={viewItem.name}
              className="max-h-[85vh] max-w-[90vw] object-contain"
            />
            <p className="mt-2 text-center text-sm text-white/80">
              {zoomIndex + 1} / {viewItem.images.length}
            </p>
          </div>
        </div>
      )}

      <ImageCropRotateDialog
        open={cropOpen}
        imageSrc={cropSrc}
        fileName={cropFileName}
        onOpenChange={(next) => {
          setCropOpen(next);
          if (!next && cropSrc?.startsWith('blob:')) {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
            setCropReplaceKey(null);
          }
        }}
        onApply={(file) => {
          applyCroppedPhoto(file);
        }}
      />
    </div>
  );
}
