import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Camera, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  AVATAR_FILE_ACCEPT,
  getCroppedImageBlob,
  initialsFromName,
  prepareAvatarImageForCrop,
} from "@/lib/image";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  name: string;
  previewUrl: string | null;
  onPreviewChange: (previewUrl: string | null) => void;
  onBlobReady?: (blob: Blob | null) => void;
  onRemove?: () => void;
  disabled?: boolean;
  hint?: string;
  /** Cropped photo waiting for inline save (not yet in storage). */
  pendingPhoto?: boolean;
  onSavePhoto?: () => void;
  onDiscardPending?: () => void;
  savingPhoto?: boolean;
  photoMessage?: string | null;
  photoError?: string | null;
}

export function AvatarUpload({
  name,
  previewUrl,
  onPreviewChange,
  onBlobReady,
  onRemove,
  disabled,
  hint = "Any gallery photo is fine — we crop and resize it for the directory.",
  pendingPhoto = false,
  onSavePhoto,
  onDiscardPending,
  savingPhoto = false,
  photoMessage,
  photoError,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [preparing, setPreparing] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  const openPicker = () => {
    if (disabled || preparing) return;
    setError("");
    inputRef.current?.click();
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setPreparing(true);
    setError("");
    try {
      const prepared = await prepareAvatarImageForCrop(file);
      setImageSrc(prepared);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedArea(null);
      setCropOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that image. Try another file.");
    } finally {
      setPreparing(false);
    }
  };

  const applyCrop = async () => {
    if (!imageSrc || !croppedArea) return;
    setSaving(true);
    setError("");
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedArea);
      const preview = URL.createObjectURL(blob);
      onPreviewChange(preview);
      onBlobReady?.(blob);
      setCropOpen(false);
      setImageSrc(null);
    } catch {
      setError("Could not process that image. Try another file.");
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = () => {
    onPreviewChange(null);
    onBlobReady?.(null);
    onRemove?.();
    if (inputRef.current) inputRef.current.value = "";
  };

  const initials = initialsFromName(name);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || preparing}
          className={cn(
            "relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-brand-200 bg-brand-50 transition-colors",
            !disabled && !preparing && "hover:border-gold-400 hover:bg-gold-50",
            (disabled || preparing) && "opacity-60"
          )}
          aria-label={previewUrl ? "Change profile photo" : "Add profile photo"}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-brand-700">{initials}</span>
          )}
          {!disabled && !preparing && (
            <span className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-white shadow-sm">
              <Camera className="h-4 w-4" />
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1 space-y-2 pt-1">
          <p className="text-sm font-medium text-brand-800">Profile photo (recommended)</p>
          <p className="text-xs text-brand-600">{hint}</p>
          {pendingPhoto && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-sm text-amber-950">
                Tap <span className="font-semibold">✓ Save photo</span> to add this to your profile.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={onSavePhoto}
                  disabled={disabled || savingPhoto}
                  className="inline-flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" aria-hidden />
                  {savingPhoto ? "Saving…" : "Save photo"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onDiscardPending}
                  disabled={disabled || savingPhoto}
                >
                  Discard
                </Button>
              </div>
            </div>
          )}
          {photoMessage && !pendingPhoto && (
            <p className="text-sm font-medium text-emerald-700">{photoMessage}</p>
          )}
          {photoError && <p className="text-xs text-red-600">{photoError}</p>}
          {preparing && <p className="text-xs text-brand-700">Preparing photo…</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={openPicker}
              disabled={disabled || preparing}
            >
              {preparing ? "Preparing…" : previewUrl ? "Change photo" : "Add photo"}
            </Button>
            {previewUrl && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={removePhoto}
                disabled={disabled || savingPhoto}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_FILE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      {cropOpen && imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/70 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-brand-900">Crop your photo</h3>
              <button
                type="button"
                onClick={() => setCropOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative h-72 overflow-hidden rounded-xl bg-slate-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <label className="mt-4 block text-sm text-slate-600">
              Zoom
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setCropOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void applyCrop()} disabled={saving || !croppedArea}>
                {saving ? "Applying…" : "Use photo"}
              </Button>
            </div>
            <p className="mt-2 text-center text-xs text-slate-400">
              We save a small WebP for the directory — large originals are resized automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
