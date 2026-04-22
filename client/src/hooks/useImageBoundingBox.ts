// client/src/hooks/useImageBoundingBox.ts
import { useState, useEffect, useCallback, type RefObject } from "react";

export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function useImageBoundingBox(
  imgRef: RefObject<HTMLImageElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
): BoundingBox | null {
  const [box, setBox] = useState<BoundingBox | null>(null);

  const updateBoundingBox = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    const left = imgRect.left - containerRect.left;
    const top = imgRect.top - containerRect.top;
    const width = imgRect.width;
    const height = imgRect.height;

    if (width > 0 && height > 0) {
      setBox({ left, top, width, height });
    }
  }, [imgRef, containerRef]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const handleLoad = () => updateBoundingBox();
    if (img.complete) {
      updateBoundingBox();
    } else {
      img.addEventListener("load", handleLoad);
      return () => img.removeEventListener("load", handleLoad);
    }
  }, [imgRef, updateBoundingBox]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => updateBoundingBox());
    resizeObserver.observe(container);
    window.addEventListener("resize", updateBoundingBox);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateBoundingBox);
    };
  }, [containerRef, updateBoundingBox]);

  return box;
}
