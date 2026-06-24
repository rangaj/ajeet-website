import { initialsFromName } from "@/lib/image";
import { useProfilePhotoUrl } from "@/lib/profile-photo";
import { parseHouses, getHouseColor } from "@/constants/houses";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "h-10 w-10 text-xs",
  md: "h-14 w-14 text-sm",
  lg: "h-[4.5rem] w-[4.5rem] text-base",
  xl: "h-20 w-20 text-lg",
} as const;

interface MemberAvatarProps {
  name: string;
  profilePhotoPath?: string | null;
  houseValue?: string | null;
  size?: keyof typeof sizeClasses;
  className?: string;
  /** Use when photo URL is already resolved (e.g. profile editor). */
  photoUrl?: string | null;
}

export function MemberAvatar({
  name,
  profilePhotoPath,
  houseValue,
  size = "md",
  className,
  photoUrl: photoUrlOverride,
}: MemberAvatarProps) {
  const { url: signedUrl, loading } = useProfilePhotoUrl(
    photoUrlOverride === undefined ? profilePhotoPath : null
  );
  const photoUrl = photoUrlOverride !== undefined ? photoUrlOverride : signedUrl;
  const houses = parseHouses(houseValue);
  const ringColor = houses.length === 1 ? getHouseColor(houses[0]) : "#c9a227";
  const initials = initialsFromName(name);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-brand-50",
        sizeClasses[size],
        className
      )}
      style={{ boxShadow: `0 0 0 2px ${ringColor}` }}
      aria-hidden={!photoUrl}
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span
          className={cn(
            "flex h-full w-full items-center justify-center font-bold text-brand-700",
            loading && "animate-pulse bg-brand-100"
          )}
        >
          {!loading && initials}
        </span>
      )}
    </div>
  );
}
