/**
 * Standard shop product image: square canvas, full product visible (contain), light letterbox.
 * Limited Offer banner uses a separate 4:5 cover crop for full-bleed shop hero.
 */

export const SHOP_IMAGE_SIZE = 1200;
export const OFFER_IMAGE_WIDTH = 1200;
export const OFFER_IMAGE_HEIGHT = 1500;
export const SHOP_IMAGE_MIME = 'image/jpeg';
export const SHOP_IMAGE_QUALITY = 0.88;
/** Light canvas — matches shop UI (avoid dark letterbox looking like a “blue block”). */
export const SHOP_IMAGE_BG = '#f2f2f7';

export function shopImageHint(): string {
  return (
    `Recommended ${SHOP_IMAGE_SIZE}×${SHOP_IMAGE_SIZE}px square (JPEG/PNG/WebP). ` +
    `Front photo is the Collection card cover — use a clear product shot, centred. ` +
    `Uploads are auto-resized to ${SHOP_IMAGE_SIZE}px square.`
  );
}

/** Short lines for the Add Product gallery. */
export function shopImageSizeGuide(): string[] {
  return [
    `Best size: ${SHOP_IMAGE_SIZE}×${SHOP_IMAGE_SIZE}px square`,
    'Front = Collection / product cards',
    'Back / Side / Other = product detail gallery',
    'Min ~800px · Max ~4000px before auto-resize',
    'Avoid heavy crops; leave a little padding around the piece',
  ];
}

export function offerImageHint(): string {
  return (
    `Recommended ${OFFER_IMAGE_WIDTH}×${OFFER_IMAGE_HEIGHT}px (4:5 portrait). ` +
    `This fills the Limited Time / Special Offer hero on Shop — keep the piece centred; edges may crop slightly. ` +
    `Uploads are auto-cropped to ${OFFER_IMAGE_WIDTH}×${OFFER_IMAGE_HEIGHT}.`
  );
}

export function offerImageSizeGuide(): string[] {
  return [
    `Best size: ${OFFER_IMAGE_WIDTH}×${OFFER_IMAGE_HEIGHT}px (4:5)`,
    'Separate from gallery photos — used only for Limited Offer hero',
    'Portrait works best on mobile full-bleed',
    'Centre the jewellery; top/bottom may crop on wide desktop',
  ];
}

/**
 * Normalize any image file to a square JPEG for consistent Collection / Product gallery display.
 */
export async function prepareShopImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file');
  }

  const bitmap = await loadImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = SHOP_IMAGE_SIZE;
    canvas.height = SHOP_IMAGE_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    ctx.fillStyle = SHOP_IMAGE_BG;
    ctx.fillRect(0, 0, SHOP_IMAGE_SIZE, SHOP_IMAGE_SIZE);

    const scale = Math.min(
      SHOP_IMAGE_SIZE / bitmap.width,
      SHOP_IMAGE_SIZE / bitmap.height
    );
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    const x = (SHOP_IMAGE_SIZE - w) / 2;
    const y = (SHOP_IMAGE_SIZE - h) / 2;
    ctx.drawImage(bitmap, x, y, w, h);

    return await canvasToJpegFile(canvas, file.name);
  } finally {
    bitmap.close?.();
  }
}

/**
 * Cover-crop to 4:5 for Limited Offer full-bleed hero (matches shop aspect-[4/5]).
 */
export async function prepareOfferImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file');
  }

  const bitmap = await loadImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = OFFER_IMAGE_WIDTH;
    canvas.height = OFFER_IMAGE_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    ctx.fillStyle = SHOP_IMAGE_BG;
    ctx.fillRect(0, 0, OFFER_IMAGE_WIDTH, OFFER_IMAGE_HEIGHT);

    const scale = Math.max(
      OFFER_IMAGE_WIDTH / bitmap.width,
      OFFER_IMAGE_HEIGHT / bitmap.height
    );
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    const x = (OFFER_IMAGE_WIDTH - w) / 2;
    const y = (OFFER_IMAGE_HEIGHT - h) / 2;
    ctx.drawImage(bitmap, x, y, w, h);

    return await canvasToJpegFile(canvas, file.name, 'offer');
  } finally {
    bitmap.close?.();
  }
}

async function canvasToJpegFile(
  canvas: HTMLCanvasElement,
  originalName: string,
  suffix = 'product'
): Promise<File> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Image encode failed'))),
      SHOP_IMAGE_MIME,
      SHOP_IMAGE_QUALITY
    );
  });
  const base = originalName.replace(/\.[^.]+$/, '') || suffix;
  return new File([blob], `${base}.jpg`, { type: SHOP_IMAGE_MIME, lastModified: Date.now() });
}

async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to read image'));
      el.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(img, 0, 0);
    return await createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}
