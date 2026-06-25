type FocusableField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function isCoarsePointerDevice() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

/** Keep the focused field visible above the mobile keyboard without fighting the browser. */
export function scrollFieldIntoViewOnFocus(e: React.FocusEvent<FocusableField>) {
  if (!isCoarsePointerDevice()) return;

  const el = e.currentTarget;
  window.setTimeout(() => {
    const viewport = window.visualViewport;
    if (!viewport) {
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
      return;
    }

    const rect = el.getBoundingClientRect();
    const visibleTop = viewport.offsetTop + 12;
    const visibleBottom = viewport.offsetTop + viewport.height - 12;

    if (rect.bottom > visibleBottom) {
      window.scrollBy({ top: rect.bottom - visibleBottom + 24, behavior: "auto" });
    } else if (rect.top < visibleTop) {
      window.scrollBy({ top: rect.top - visibleTop - 8, behavior: "auto" });
    }
  }, 320);
}

export function mergeFocusHandlers<T extends FocusableField>(
  userHandler: React.FocusEventHandler<T> | undefined,
  ourHandler: React.FocusEventHandler<T>
): React.FocusEventHandler<T> {
  return (event) => {
    userHandler?.(event);
    if (!event.defaultPrevented) ourHandler(event);
  };
}
