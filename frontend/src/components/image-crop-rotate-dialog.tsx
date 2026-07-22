'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { type Area, type MediaSize, type Point } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, RotateCcw, RotateCw, X } from 'lucide-react';
import { SHOP_IMAGE_BG, SHOP_IMAGE_MIME, SHOP_IMAGE_QUALITY, SHOP_IMAGE_SIZE } from '@/lib/shop-image';

type ImageCropRotateDialogProps = {
  open: boolean;
  imageSrc: string | null;
  fileName?: string;
  onOpenChange: (open: boolean) => void;
  onApply: (file: File) => void | Promise<void>;
};

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', () => reject(new Error('Failed to load image')));
    // crossOrigin on blob:/data: breaks decoding in some browsers
    if (url.startsWith('http://') || url.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.src = url;
  });
}

function rad(deg: number) {
  return (deg * Math.PI) / 180;
}

function rotatedSize(width: number, height: number, rotation: number) {
  const r = rad(rotation);
  const cos = Math.abs(Math.cos(r));
  const sin = Math.abs(Math.sin(r));
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
}

/** Re-encode any blob/file to a clean JPEG so Cropper can zoom/rotate reliably. */
export async function normalizeImageFile(input: Blob | File, fileName = 'showcase.jpg'): Promise<File> {
  const bitmap = await createImageBitmap(input);
  try {
    const maxEdge = 2400;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Image encode failed'))),
        SHOP_IMAGE_MIME,
        0.92
      );
    });
    const base = fileName.replace(/\.[^.]+$/, '') || 'showcase';
    return new File([blob], `${base}.jpg`, { type: SHOP_IMAGE_MIME, lastModified: Date.now() });
  } finally {
    bitmap.close?.();
  }
}

export async function getCroppedRotatedImage(
  imageSrc: string,
  crop: Area,
  rotation: number,
  fileName = 'showcase'
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const { width: bBoxW, height: bBoxH } = rotatedSize(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    rotation
  );

  const rotCanvas = document.createElement('canvas');
  rotCanvas.width = Math.max(1, Math.ceil(bBoxW));
  rotCanvas.height = Math.max(1, Math.ceil(bBoxH));
  const rotCtx = rotCanvas.getContext('2d');
  if (!rotCtx) throw new Error('Canvas not supported');

  rotCtx.fillStyle = SHOP_IMAGE_BG;
  rotCtx.fillRect(0, 0, rotCanvas.width, rotCanvas.height);
  rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
  rotCtx.rotate(rad(rotation));
  rotCtx.drawImage(
    image,
    -image.naturalWidth / 2,
    -image.naturalHeight / 2,
    image.naturalWidth,
    image.naturalHeight
  );

  canvas.width = SHOP_IMAGE_SIZE;
  canvas.height = SHOP_IMAGE_SIZE;
  ctx.fillStyle = SHOP_IMAGE_BG;
  ctx.fillRect(0, 0, SHOP_IMAGE_SIZE, SHOP_IMAGE_SIZE);

  const sx = Math.max(0, Math.round(crop.x));
  const sy = Math.max(0, Math.round(crop.y));
  const sw = Math.max(1, Math.round(crop.width));
  const sh = Math.max(1, Math.round(crop.height));

  ctx.drawImage(rotCanvas, sx, sy, sw, sh, 0, 0, SHOP_IMAGE_SIZE, SHOP_IMAGE_SIZE);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Image encode failed'))),
      SHOP_IMAGE_MIME,
      SHOP_IMAGE_QUALITY
    );
  });

  const base = fileName.replace(/\.[^.]+$/, '') || 'showcase';
  return new File([blob], `${base}.jpg`, { type: SHOP_IMAGE_MIME, lastModified: Date.now() });
}

export function ImageCropRotateDialog({
  open,
  imageSrc,
  fileName = 'showcase.jpg',
  onOpenChange,
  onApply,
}: ImageCropRotateDialogProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    setMediaReady(false);
    setError('');
    setApplying(false);
  }, [open, imageSrc]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !applying) onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, applying, onOpenChange]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const onMediaLoaded = useCallback((_size: MediaSize) => {
    setMediaReady(true);
  }, []);

  async function handleApply() {
    if (!imageSrc || !croppedAreaPixels) return;
    setApplying(true);
    setError('');
    try {
      const file = await getCroppedRotatedImage(imageSrc, croppedAreaPixels, rotation, fileName);
      await onApply(file);
      onOpenChange(false);
    } catch {
      setError('Crop / rotate မအောင်မြင်ပါ');
    } finally {
      setApplying(false);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      style={{ pointerEvents: 'auto' }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div
        className="flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-neutral-900 sm:rounded-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Crop and rotate image"
        style={{ pointerEvents: 'auto' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#f0f0f0] px-4 py-3 dark:border-neutral-800">
          <h2 className="text-base font-semibold text-[#262626] dark:text-neutral-100">
            Crop &amp; Rotate
          </h2>
          <button
            type="button"
            className="rounded-md p-1.5 text-[#8c8c8c] hover:bg-[#f5f5f5] dark:hover:bg-neutral-800"
            onClick={() => !applying && onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mx-4 mt-3 h-[min(48vh,340px)] overflow-hidden rounded-lg bg-neutral-900">
          {imageSrc ? (
            <Cropper
              key={imageSrc}
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={1}
              maxZoom={4}
              rotation={rotation}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              onMediaLoaded={onMediaLoaded}
              showGrid
              style={{
                containerStyle: { background: '#171717' },
              }}
            />
          ) : null}
          {!mediaReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>

        <div className="space-y-3 overflow-y-auto px-4 py-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="crop-zoom">Zoom</Label>
              <span className="text-xs text-[#8c8c8c]">{zoom.toFixed(2)}×</span>
            </div>
            <input
              id="crop-zoom"
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              disabled={!mediaReady}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-primary disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="crop-rotate">Rotate (0° – 360°)</Label>
              <span className="text-xs tabular-nums text-[#8c8c8c]">{Math.round(rotation)}°</span>
            </div>
            <input
              id="crop-rotate"
              type="range"
              min={0}
              max={360}
              step={1}
              value={rotation}
              disabled={!mediaReady}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="w-full accent-primary disabled:opacity-50"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!mediaReady}
                onClick={() => setRotation((r) => (r + 270) % 360)}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                -90°
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!mediaReady}
                onClick={() => setRotation((r) => (r + 90) % 360)}
              >
                <RotateCw className="mr-1.5 h-3.5 w-3.5" />
                +90°
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!mediaReady}
                onClick={() => {
                  setRotation(0);
                  setZoom(1);
                  setCrop({ x: 0, y: 0 });
                }}
              >
                Reset
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-[#f0f0f0] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-neutral-800">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={applying}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={() => void handleApply()}
            disabled={applying || !croppedAreaPixels || !mediaReady}
          >
            {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Apply
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
