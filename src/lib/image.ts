/** Safety cap for raw uploads — large files are downscaled before crop. */
export const AVATAR_MAX_INPUT_BYTES = 20 * 1024 * 1024;
export const AVATAR_MAX_INPUT_DIMENSION = 2048;
export const AVATAR_OUTPUT_SIZE = 512;
export const AVATAR_WEBP_QUALITY = 0.82;

const AVATAR_INPUT_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const AVATAR_FILE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

export type PixelCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });
}

function canvasToJpegDataUrl(canvas: HTMLCanvasElement, quality = 0.92): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to encode image"));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error("Failed to read encoded image"));
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

function isAllowedAvatarFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (AVATAR_INPUT_MIME_TYPES.includes(type as (typeof AVATAR_INPUT_MIME_TYPES)[number])) {
    return true;
  }
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

export function validateAvatarFile(file: File): string | null {
  if (!isAllowedAvatarFile(file)) {
    return "Use a photo from your gallery (JPG, PNG, or WebP).";
  }
  if (file.size > AVATAR_MAX_INPUT_BYTES) {
    const maxMb = Math.round(AVATAR_MAX_INPUT_BYTES / (1024 * 1024));
    return `Image must be ${maxMb} MB or smaller.`;
  }
  return null;
}

/** Read and downscale very large photos so crop works on mobile browsers. */
export async function prepareAvatarImageForCrop(file: File): Promise<string> {
  const validationError = validateAvatarFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const maxDim = Math.max(image.naturalWidth, image.naturalHeight);

  if (maxDim <= AVATAR_MAX_INPUT_DIMENSION) {
    return dataUrl;
  }

  const scale = AVATAR_MAX_INPUT_DIMENSION / maxDim;
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(image, 0, 0, width, height);
  return canvasToJpegDataUrl(canvas);
}

export async function getCroppedImageBlob(
  imageSrc: string,
  crop: PixelCrop,
  outputSize = AVATAR_OUTPUT_SIZE
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode image"))),
      "image/webp",
      AVATAR_WEBP_QUALITY
    );
  });
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const PENDING_REG_AVATAR_KEY = "pending_reg_avatar";

export function storePendingAvatar(dataUrl: string) {
  try {
    sessionStorage.setItem(PENDING_REG_AVATAR_KEY, dataUrl);
  } catch {
    // Quota exceeded — skip silently; user can add photo on Profile later.
  }
}

export function takePendingAvatar(): string | null {
  const value = sessionStorage.getItem(PENDING_REG_AVATAR_KEY);
  if (value) sessionStorage.removeItem(PENDING_REG_AVATAR_KEY);
  return value;
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
