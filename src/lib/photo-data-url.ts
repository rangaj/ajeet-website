import { supabase } from "@/lib/supabase";
import { parseStorageRef } from "@/lib/storage";

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Download via Supabase client (avoids iOS Safari CORS issues with signed URLs). */
export async function profilePhotoToDataUrl(
  profilePhotoPath: string | null | undefined
): Promise<string | null> {
  const ref = parseStorageRef(profilePhotoPath);
  if (!ref) return null;

  const { data, error } = await supabase.storage.from(ref.bucket).download(ref.path);
  if (error || !data) return null;

  return blobToDataUrl(data);
}

export async function sameOriginImageToDataUrl(url: string): Promise<string | null> {
  if (url.startsWith("data:")) return url;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return blobToDataUrl(await response.blob());
  } catch {
    return null;
  }
}

export function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          const done = () => resolve();
          if (img.complete && img.naturalWidth > 0) {
            if (img.decode) {
              void img.decode().then(done).catch(done);
            } else {
              done();
            }
            return;
          }
          img.onload = done;
          img.onerror = done;
        })
    )
  ).then(() => undefined);
}
