import { toPng } from "html-to-image";

async function inlineImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(async (img) => {
      if (!img.src || img.src.startsWith("data:")) return;
      try {
        const response = await fetch(img.src);
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        img.src = dataUrl;
      } catch {
        // Keep remote src if inlining fails.
      }
    })
  );
}

export async function captureShareCardImage(node: HTMLElement): Promise<Blob> {
  await inlineImages(node);
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 3,
    backgroundColor: "#ffffff",
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
