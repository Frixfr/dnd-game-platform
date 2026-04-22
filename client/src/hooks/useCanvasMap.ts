// client/src/hooks/useCanvasMap.ts
import { useEffect, useRef, useCallback, type RefObject } from "react";

interface ExtendedToken {
  id: number;
  map_id: number;
  entity_type: "player" | "npc";
  entity_id: number;
  x: number;
  y: number;
  is_grayscale: boolean;
  scale: number;
  updated_at: string;
  entity_name: string;
  avatar_url?: string | null;
}

interface UseCanvasMapOptions {
  mapImageUrl: string;
  tokens: ExtendedToken[];
  originalWidth: number;
  originalHeight: number;
  onTokenDrag?: (
    token: ExtendedToken,
    newAbsX: number,
    newAbsY: number,
  ) => void;
  onCanvasClick?: (relX: number, relY: number) => void;
  onCanvasContextMenu?: (relX: number, relY: number) => void;
  onTokenContextMenu?: (
    token: ExtendedToken,
    clientX: number,
    clientY: number,
  ) => void;
}

function drawToken(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  grayscale: boolean,
) {
  ctx.save();
  if (grayscale) {
    ctx.filter = "grayscale(100%)";
  }
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function useCanvasMap(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  options: UseCanvasMapOptions,
) {
  const {
    mapImageUrl,
    tokens,
    originalWidth,
    originalHeight,
    onTokenDrag,
    onCanvasClick,
    onCanvasContextMenu,
    onTokenContextMenu,
  } = options;
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    token: ExtendedToken;
    startX: number;
    startY: number;
    startRelX: number;
    startRelY: number;
  } | null>(null);
  const avatarCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const getDrawParams = useCallback(
    (canvas: HTMLCanvasElement, img: HTMLImageElement) => {
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const imgWidth = img.width;
      const imgHeight = img.height;
      const imgAspect = imgWidth / imgHeight;
      const canvasAspect = canvasWidth / canvasHeight;

      let drawWidth, drawHeight, offsetX, offsetY;
      if (imgAspect > canvasAspect) {
        drawWidth = canvasWidth;
        drawHeight = drawWidth / imgAspect;
        offsetX = 0;
        offsetY = (canvasHeight - drawHeight) / 2;
      } else {
        drawHeight = canvasHeight;
        drawWidth = drawHeight * imgAspect;
        offsetX = (canvasWidth - drawWidth) / 2;
        offsetY = 0;
      }
      return { drawWidth, drawHeight, offsetX, offsetY };
    },
    [],
  );

  // Загрузка недостающих аватаров
  const ensureAvatars = useCallback(async (requiredUrls: string[]) => {
    const missingUrls = requiredUrls.filter(
      (url) => !avatarCacheRef.current.has(url),
    );
    if (missingUrls.length === 0) return;
    const promises = missingUrls.map((url) => {
      return new Promise<{ url: string; img: HTMLImageElement }>((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve({ url, img });
        img.onerror = () => resolve({ url, img: new Image() });
        img.src = url;
      });
    });
    const results = await Promise.all(promises);
    results.forEach(({ url, img }) => avatarCacheRef.current.set(url, img));
  }, []);

  const drawCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    const mapImg = imageRef.current;
    if (!canvas || !mapImg) return;

    // Собираем уникальные URL аватаров
    const uniqueUrls = Array.from(
      new Set(tokens.map((t) => t.avatar_url || "/default-avatar.png")),
    );
    await ensureAvatars(uniqueUrls);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    const { drawWidth, drawHeight, offsetX, offsetY } = getDrawParams(
      canvas,
      mapImg,
    );
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(mapImg, offsetX, offsetY, drawWidth, drawHeight);

    for (const token of tokens) {
      let relX, relY;
      if (token.x <= 1 && token.y <= 1) {
        relX = token.x;
        relY = token.y;
      } else {
        relX = token.x / originalWidth;
        relY = token.y / originalHeight;
      }
      const canvasX = offsetX + relX * drawWidth;
      const canvasY = offsetY + relY * drawHeight;

      let tokenSize =
        Math.min(80, Math.max(24, drawWidth * 0.05)) * token.scale;
      tokenSize = Math.min(80, tokenSize);

      const avatarUrl = token.avatar_url || "/default-avatar.png";
      const avatarImg = avatarCacheRef.current.get(avatarUrl);
      if (avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0) {
        drawToken(
          ctx,
          avatarImg,
          canvasX,
          canvasY,
          tokenSize,
          token.is_grayscale,
        );
      } else {
        // fallback: серый круг
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, tokenSize / 2, 0, 2 * Math.PI);
        ctx.fillStyle = "#888";
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.stroke();
      }

      ctx.font = `bold ${Math.max(10, tokenSize * 0.3)}px sans-serif`;
      ctx.fillStyle = "white";
      ctx.shadowBlur = 4;
      ctx.shadowColor = "black";
      ctx.fillText(
        token.entity_name,
        canvasX - tokenSize / 2,
        canvasY - tokenSize / 2 - 5,
      );
      ctx.shadowBlur = 0;
    }
  }, [
    canvasRef,
    tokens,
    originalWidth,
    originalHeight,
    getDrawParams,
    ensureAvatars,
  ]);

  // Загрузка карты
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = mapImageUrl;
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
    return () => {
      imageRef.current = null;
    };
  }, [mapImageUrl, drawCanvas]);

  // Перерисовка при изменении токенов или ресайзе
  useEffect(() => {
    drawCanvas();
    window.addEventListener("resize", drawCanvas);
    return () => window.removeEventListener("resize", drawCanvas);
  }, [drawCanvas]);

  // Обработка перетаскивания и кликов (без изменений)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getMouseCanvasCoords = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        mouseX: (e.clientX - rect.left) * scaleX,
        mouseY: (e.clientY - rect.top) * scaleY,
      };
    };

    const getTokenAt = (mouseX: number, mouseY: number) => {
      const img = imageRef.current;
      if (!img) return null;
      const { drawWidth, drawHeight, offsetX, offsetY } = getDrawParams(
        canvas,
        img,
      );
      for (const token of tokens) {
        let relX, relY;
        if (token.x <= 1 && token.y <= 1) {
          relX = token.x;
          relY = token.y;
        } else {
          relX = token.x / originalWidth;
          relY = token.y / originalHeight;
        }
        const tokenCanvasX = offsetX + relX * drawWidth;
        const tokenCanvasY = offsetY + relY * drawHeight;
        let tokenSize =
          Math.min(80, Math.max(24, drawWidth * 0.05)) * token.scale;
        tokenSize = Math.min(80, tokenSize);
        const dx = mouseX - tokenCanvasX;
        const dy = mouseY - tokenCanvasY;
        if (Math.hypot(dx, dy) <= tokenSize / 2) {
          return token;
        }
      }
      return null;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!onTokenDrag) return;
      if (e.button !== 0) return;
      const { mouseX, mouseY } = getMouseCanvasCoords(e);
      const token = getTokenAt(mouseX, mouseY);
      if (!token) return;
      const img = imageRef.current;
      if (!img) return;
      let relX, relY;
      if (token.x <= 1 && token.y <= 1) {
        relX = token.x;
        relY = token.y;
      } else {
        relX = token.x / originalWidth;
        relY = token.y / originalHeight;
      }
      dragRef.current = {
        token,
        startX: mouseX,
        startY: mouseY,
        startRelX: relX,
        startRelY: relY,
      };
      canvas.style.cursor = "grabbing";
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { mouseX, mouseY } = getMouseCanvasCoords(e);
      const img = imageRef.current;
      if (!img) return;
      const { drawWidth, drawHeight } = getDrawParams(canvas, img);

      const deltaX = (mouseX - dragRef.current.startX) / drawWidth;
      const deltaY = (mouseY - dragRef.current.startY) / drawHeight;
      let newRelX = dragRef.current.startRelX + deltaX;
      let newRelY = dragRef.current.startRelY + deltaY;
      newRelX = Math.min(1, Math.max(0, newRelX));
      newRelY = Math.min(1, Math.max(0, newRelY));

      const newAbsX = newRelX * originalWidth;
      const newAbsY = newRelY * originalHeight;

      onTokenDrag?.(dragRef.current.token, newAbsX, newAbsY);

      dragRef.current.startX = mouseX;
      dragRef.current.startY = mouseY;
      dragRef.current.startRelX = newRelX;
      dragRef.current.startRelY = newRelY;
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      canvas.style.cursor = "default";
    };

    const handleClick = (e: MouseEvent) => {
      if (!onCanvasClick) return;
      if (e.button !== 0) return;
      const { mouseX, mouseY } = getMouseCanvasCoords(e);
      const img = imageRef.current;
      if (!img) return;
      const { drawWidth, drawHeight, offsetX, offsetY } = getDrawParams(
        canvas,
        img,
      );
      const relX = (mouseX - offsetX) / drawWidth;
      const relY = (mouseY - offsetY) / drawHeight;
      if (relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1) {
        onCanvasClick(relX, relY);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const { mouseX, mouseY } = getMouseCanvasCoords(e);
      const token = getTokenAt(mouseX, mouseY);
      const img = imageRef.current;
      if (!img) return;
      const { drawWidth, drawHeight, offsetX, offsetY } = getDrawParams(
        canvas,
        img,
      );
      const relX = (mouseX - offsetX) / drawWidth;
      const relY = (mouseY - offsetY) / drawHeight;
      if (relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1) {
        if (token && onTokenContextMenu) {
          onTokenContextMenu(token, e.clientX, e.clientY);
        } else if (!token && onCanvasContextMenu) {
          onCanvasContextMenu(relX, relY);
        }
      }
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("contextmenu", handleContextMenu);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [
    canvasRef,
    tokens,
    originalWidth,
    originalHeight,
    onTokenDrag,
    onCanvasClick,
    onCanvasContextMenu,
    onTokenContextMenu,
    getDrawParams,
  ]);
}
