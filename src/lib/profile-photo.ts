import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { parseStorageRef } from "@/lib/storage";

const photoUrlCache = new Map<string, string>();

function revokeCachedUrl(url: string | undefined) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

export function invalidateProfilePhotoCache(profilePhotoPath?: string | null) {
  if (profilePhotoPath) {
    revokeCachedUrl(photoUrlCache.get(profilePhotoPath));
    photoUrlCache.delete(profilePhotoPath);
    return;
  }
  for (const url of photoUrlCache.values()) {
    revokeCachedUrl(url);
  }
  photoUrlCache.clear();
}

/** After upload, show the saved bytes immediately without re-downloading storage. */
export function primeProfilePhotoCache(profilePhotoPath: string, blob: Blob): string {
  invalidateProfilePhotoCache(profilePhotoPath);
  const blobUrl = URL.createObjectURL(blob);
  photoUrlCache.set(profilePhotoPath, blobUrl);
  return blobUrl;
}

/** Load via authenticated download (avoids signed-URL CORS issues in img tags). */
export async function resolveProfilePhotoUrl(
  profilePhotoPath: string | null | undefined
): Promise<string | null> {
  if (!profilePhotoPath) return null;

  const cached = photoUrlCache.get(profilePhotoPath);
  if (cached) return cached;

  const ref = parseStorageRef(profilePhotoPath);
  if (!ref) return null;

  const { data, error } = await supabase.storage.from(ref.bucket).download(ref.path);

  if (error || !data) return null;

  const blobUrl = URL.createObjectURL(data);
  photoUrlCache.set(profilePhotoPath, blobUrl);
  return blobUrl;
}

export function useProfilePhotoUrl(profilePhotoPath: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(() =>
    profilePhotoPath ? photoUrlCache.get(profilePhotoPath) ?? null : null
  );
  const [loading, setLoading] = useState(Boolean(profilePhotoPath && !url));

  useEffect(() => {
    if (!profilePhotoPath) {
      setUrl(null);
      setLoading(false);
      return;
    }

    const cached = photoUrlCache.get(profilePhotoPath);
    if (cached) {
      setUrl(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void resolveProfilePhotoUrl(profilePhotoPath).then((resolved) => {
      if (cancelled) return;
      setUrl(resolved);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [profilePhotoPath]);

  return { url, loading };
}
