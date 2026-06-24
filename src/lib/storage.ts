export function parseStorageRef(ref: string | null | undefined): {
  bucket: string;
  path: string;
} | null {
  if (!ref) return null;
  if (ref.startsWith("registration-assets/")) {
    return { bucket: "registration-assets", path: ref.slice("registration-assets/".length) };
  }
  return { bucket: "profile-photos", path: ref };
}

export function registrationAssetPath(userId: string): string {
  return `registration-assets/${userId}/avatar.webp`;
}

export function profilePhotoPath(memberId: string): string {
  return `${memberId}/avatar.webp`;
}

/** Preferred path — matches storage RLS (auth user id folder). */
export function profilePhotoPathForUser(userId: string): string {
  return `${userId}/avatar.webp`;
}
