export const AVATAR_MAX_INPUT_BYTES = 2 * 1024 * 1024;
export const AVATAR_OUTPUT_SIZE = 512;
export const AVATAR_WEBP_QUALITY = 0.82;

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

export function validateAvatarFile(file: File): string | null {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return "Use a JPG, PNG, or WebP image.";
  }
  if (file.size > AVATAR_MAX_INPUT_BYTES) {
    return "Image must be 2 MB or smaller.";
  }
  return null;
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
