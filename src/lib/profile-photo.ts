import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { parseStorageRef } from "@/lib/storage";

const photoUrlCache = new Map<string, string>();
const SIGNED_URL_TTL = 3600;

export async function resolveProfilePhotoUrl(
  profilePhotoPath: string | null | undefined
): Promise<string | null> {
  if (!profilePhotoPath) return null;

  const cached = photoUrlCache.get(profilePhotoPath);
  if (cached) return cached;

  const ref = parseStorageRef(profilePhotoPath);
  if (!ref) return null;

  const { data, error } = await supabase.storage
    .from(ref.bucket)
    .createSignedUrl(ref.path, SIGNED_URL_TTL);

  if (error || !data?.signedUrl) return null;

  photoUrlCache.set(profilePhotoPath, data.signedUrl);
  return data.signedUrl;
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
