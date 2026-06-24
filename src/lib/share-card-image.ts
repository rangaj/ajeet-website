import { toPng } from "html-to-image";
import { sameOriginImageToDataUrl, waitForImages } from "@/lib/photo-data-url";

async function inlineRemoteImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(async (img) => {
      if (!img.src || img.src.startsWith("data:")) return;
      const dataUrl = await sameOriginImageToDataUrl(img.src);
      if (dataUrl) img.src = dataUrl;
    })
  );
}

async function waitForPaint() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export async function captureShareCardImage(node: HTMLElement): Promise<Blob> {
  await waitForImages(node);
  await inlineRemoteImages(node);
  await waitForImages(node);
  await waitForPaint();

  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    skipFonts: true,
  });
  const response = await fetch(dataUrl);
  return response.blob();
}

export function downloadShareCardImage(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function shareShareCardImage(
  blob: Blob,
  options: { title: string; text?: string }
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], "ajeet-alumni-card.png", { type: "image/png" });
  const payload: ShareData = {
    files: [file],
    title: options.title,
    text: options.text,
  };

  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share(payload);
    return "shared";
  }

  downloadShareCardImage(blob, "ajeet-alumni-card.png");
  return "downloaded";
}

export function whatsAppShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
