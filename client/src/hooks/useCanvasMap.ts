// client/src/hooks/useCanvasMap.ts
import { useEffect, useRef, useCallback, type RefObject } from "react";

// Расширенный тип токена
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
}

// Рисование токена
function drawToken(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  grayscale: boolean,
) {
  if (grayscale) {
    ctx.save();
    ctx.filter = "grayscale(100%)";
  }
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
  if (grayscale) ctx.restore();
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
  } = options;
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    token: ExtendedToken;
    startX: number;
    startY: number;
    startRelX: number;
    startRelY: number;
  } | null>(null);

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

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

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
      img,
    );

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    tokens.forEach((token) => {
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

      // Размер токена: 5% от ШИРИНЫ ОТРИСОВАННОЙ КАРТИНКИ (drawWidth), а не canvas.width
      let tokenSize =
        Math.min(80, Math.max(24, drawWidth * 0.05)) * token.scale;
      tokenSize = Math.min(80, tokenSize);

      const avatar = new Image();
      avatar.src = token.avatar_url || "/default-avatar.png";
      if (avatar.complete) {
        drawToken(ctx, avatar, canvasX, canvasY, tokenSize, token.is_grayscale);
      } else {
        avatar.onload = () =>
          drawToken(
            ctx,
            avatar,
            canvasX,
            canvasY,
            tokenSize,
            token.is_grayscale,
          );
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
    });
  }, [canvasRef, tokens, originalWidth, originalHeight, getDrawParams]);

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

  useEffect(() => {
    drawCanvas();
    window.addEventListener("resize", drawCanvas);
    return () => window.removeEventListener("resize", drawCanvas);
  }, [drawCanvas]);

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

    const handleMouseDown = (e: MouseEvent) => {
      if (!onTokenDrag) return;
      const { mouseX, mouseY } = getMouseCanvasCoords(e);
      const img = imageRef.current;
      if (!img) return;

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
        // Используем drawWidth для размера токена (единообразие)
        let tokenSize =
          Math.min(80, Math.max(24, drawWidth * 0.05)) * token.scale;
        tokenSize = Math.min(80, tokenSize);
        const dx = mouseX - tokenCanvasX;
        const dy = mouseY - tokenCanvasY;
        if (Math.hypot(dx, dy) <= tokenSize / 2) {
          dragRef.current = {
            token,
            startX: mouseX,
            startY: mouseY,
            startRelX: relX,
            startRelY: relY,
          };
          canvas.style.cursor = "grabbing";
          e.preventDefault();
          break;
        }
      }
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

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("click", handleClick);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("click", handleClick);
    };
  }, [
    canvasRef,
    tokens,
    originalWidth,
    originalHeight,
    onTokenDrag,
    onCanvasClick,
    getDrawParams,
  ]);
}
