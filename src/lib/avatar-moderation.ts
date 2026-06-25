/** Block when model confidence exceeds these thresholds (0–1). */
const BLOCK_THRESHOLDS: Record<string, number> = {
  Porn: 0.8,
  Hentai: 0.8,
};

const BLOCKED_MESSAGE =
  "This photo doesn't meet our community guidelines. Please upload a clear, appropriate face photo.";

export type AvatarModerationResult =
  | { allowed: true }
  | { allowed: false; message: string };

type NsfwModel = {
  classify: (
    image: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
    topK?: number
  ) => Promise<Array<{ className: string; probability: number }>>;
};

let modelPromise: Promise<NsfwModel> | null = null;

async function loadNsfwModel(): Promise<NsfwModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      const nsfwjs = await import("nsfwjs");
      return nsfwjs.load() as Promise<NsfwModel>;
    })();
  }
  return modelPromise;
}

/** Warm the model while the user adjusts the crop. */
export function preloadAvatarModerationModel(): void {
  void loadNsfwModel().catch(() => {
    modelPromise = null;
  });
}

async function blobToImageElement(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function isBlocked(
  predictions: Array<{ className: string; probability: number }>
): boolean {
  for (const prediction of predictions) {
    const threshold = BLOCK_THRESHOLDS[prediction.className];
    if (threshold !== undefined && prediction.probability >= threshold) {
      return true;
    }
  }
  return false;
}

export async function moderateAvatarBlob(blob: Blob): Promise<AvatarModerationResult> {
  try {
    const model = await loadNsfwModel();
    const image = await blobToImageElement(blob);
    const predictions = await model.classify(image);
    if (isBlocked(predictions)) {
      return { allowed: false, message: BLOCKED_MESSAGE };
    }
    return { allowed: true };
  } catch (error) {
    console.warn("Avatar moderation unavailable; allowing upload.", error);
    modelPromise = null;
    return { allowed: true };
  }
}
