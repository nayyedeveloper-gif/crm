'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SHOP_AVATARS } from '@/lib/shop-guest-store';

export function isShopPhoto(value?: string | null): boolean {
  if (!value) return false;
  return value.startsWith('http') || value.startsWith('data:image');
}

export function isShopEmoji(value?: string | null): boolean {
  if (!value || isShopPhoto(value)) return false;
  return value.length > 0 && value.length <= 8;
}

/** Compress a picked file to a small square JPEG data URL for profile photo. */
export async function compressProfilePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file');
  }
  const bitmap = await createImageBitmap(file);
  try {
    const size = 400;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    ctx.fillStyle = '#f2f2f7';
    ctx.fillRect(0, 0, size, size);

    const scale = Math.max(size / bitmap.width, size / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    const x = (size - w) / 2;
    const y = (size - h) / 2;
    ctx.drawImage(bitmap, x, y, w, h);

    return await new Promise<string>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Could not process photo'));
            return;
          }
          if (blob.size > 180_000) {
            // retry lower quality
            canvas.toBlob(
              (b2) => {
                if (!b2) {
                  reject(new Error('Photo too large'));
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(new Error('Could not read photo'));
                reader.readAsDataURL(b2);
              },
              'image/jpeg',
              0.55
            );
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Could not read photo'));
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        0.72
      );
    });
  } finally {
    bitmap.close?.();
  }
}

export function ShopAvatarBubble({
  avatar,
  size = 'lg',
  className,
}: {
  avatar?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const dim =
    size === 'xl'
      ? 'h-24 w-24 text-4xl'
      : size === 'lg'
        ? 'h-20 w-20 text-3xl'
        : size === 'md'
          ? 'h-14 w-14 text-2xl'
          : 'h-10 w-10 text-xl';

  if (isShopPhoto(avatar)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar!}
        alt=""
        className={cn(dim, 'rounded-full object-cover ring-1 ring-[#e5e5ea]', className)}
      />
    );
  }

  return (
    <div
      className={cn(
        dim,
        'flex items-center justify-center rounded-full bg-[#e5e5ea] ring-1 ring-[#e5e5ea]',
        className
      )}
    >
      {isShopEmoji(avatar) ? avatar : '💎'}
    </div>
  );
}

/** Centered photo with camera upload + optional emoji grid. */
export function ShopProfilePhotoEditor({
  value,
  onChange,
  showEmojiPicker = true,
}: {
  value: string;
  onChange: (next: string) => void;
  showEmojiPicker?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onPick(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const dataUrl = await compressProfilePhoto(file);
      onChange(dataUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <ShopAvatarBubble avatar={value} size="xl" />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#007aff] text-white shadow-md active:bg-[#0066d6] disabled:opacity-60"
            aria-label="Upload photo"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] || null)}
          />
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="text-[15px] font-medium text-[#007aff] active:opacity-60"
        >
          {isShopPhoto(value) ? 'Change photo' : 'Upload photo'}
        </button>
        {isShopPhoto(value) ? (
          <button
            type="button"
            onClick={() => onChange('💎')}
            className="text-[13px] text-[#8e8e93] active:opacity-60"
          >
            Use emoji instead
          </button>
        ) : null}
        {error ? <p className="text-sm text-[#ff3b30]">{error}</p> : null}
      </div>

      {showEmojiPicker && !isShopPhoto(value) ? (
        <div className="space-y-2">
          <p className="text-center text-[13px] uppercase tracking-wide text-[#8e8e93]">
            Or choose emoji
          </p>
          <div className="grid grid-cols-6 gap-2">
            {SHOP_AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onChange(a)}
                className={cn(
                  'flex h-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 transition active:scale-95',
                  value === a ? 'ring-2 ring-[#007aff]' : 'ring-[#e5e5ea]'
                )}
                aria-label={`Avatar ${a}`}
                aria-pressed={value === a}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated use ShopProfilePhotoEditor — kept for welcome screen emoji-only pick */
export function ShopAvatarPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (avatar: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-[13px] uppercase tracking-wide text-[#8e8e93]">Choose avatar</p>
      <div className="grid grid-cols-6 gap-2">
        {SHOP_AVATARS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onChange(a)}
            className={cn(
              'flex h-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 transition active:scale-95',
              value === a ? 'ring-2 ring-[#007aff]' : 'ring-[#e5e5ea]'
            )}
            aria-label={`Avatar ${a}`}
            aria-pressed={value === a}
          >
            {a}
          </button>
        ))}
      </div>
    </div>
  );
}
