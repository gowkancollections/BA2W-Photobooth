"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";

export type TransformHandle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "rotate";

export interface TransformerProps {
  selected: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  minSize?: number;
  scale?: number;
  onUpdate: (patch: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
  }) => void;
  onSelect?: () => void;
  onDeselect?: () => void;
  accentColor?: string;
  children: ReactNode;
}

const HANDLE_SIZE = 10;

export function Transformer({
  selected,
  x,
  y,
  width,
  height,
  rotation = 0,
  minSize = 24,
  scale = 1,
  onUpdate,
  onSelect,
  accentColor = "#D946EF",
  children,
}: TransformerProps) {
  const dragRef = useRef<{
    mode: "move" | "resize" | "rotate";
    handle?: TransformHandle;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    origRot: number;
    shiftPressed: boolean;
  } | null>(null);

  const centerX = x + width / 2;
  const centerY = y + height / 2;

  const onBodyPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    onSelect?.();
    dragRef.current = {
      mode: "move",
      startX: e.clientX,
      startY: e.clientY,
      origX: x,
      origY: y,
      origW: width,
      origH: height,
      origRot: rotation,
      shiftPressed: e.shiftKey,
    };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    e.stopPropagation();
  };

  const onHandlePointerDown = (
    e: ReactPointerEvent<HTMLDivElement>,
    handle: TransformHandle,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect?.();
    if (handle === "rotate") {
      dragRef.current = {
        mode: "rotate",
        handle,
        startX: e.clientX,
        startY: e.clientY,
        origX: x,
        origY: y,
        origW: width,
        origH: height,
        origRot: rotation,
        shiftPressed: e.shiftKey,
      };
    } else {
      dragRef.current = {
        mode: "resize",
        handle,
        startX: e.clientX,
        startY: e.clientY,
        origX: x,
        origY: y,
        origW: width,
        origH: height,
        origRot: rotation,
        shiftPressed: e.shiftKey,
      };
    }
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onWrapperMove = useCallback(
    (clientX: number, clientY: number, shiftPressed: boolean) => {
      const drag = dragRef.current;
      if (!drag) return;
      const scaleSafe = scale === 0 ? 1 : scale;
      const dxCss = (clientX - drag.startX) / scaleSafe;
      const dyCss = (clientY - drag.startY) / scaleSafe;

      if (drag.mode === "move") {
        onUpdate({
          x: drag.origX + dxCss,
          y: drag.origY + dyCss,
        });
        return;
      }

      if (drag.mode === "rotate") {
        const rect = { left: 0, top: 0, width: 0, height: 0 };
        const el = document.querySelector("[data-transformer-rotate-metric]");
        if (el) {
          const r = el.getBoundingClientRect();
          const cx1 = r.left + r.width / 2;
          const cy1 = r.top + r.height / 2;
          const a1 = Math.atan2(
            drag.startY - cy1,
            drag.startX - cx1,
          );
          const a2 = Math.atan2(clientY - cy1, clientX - cx1);
          let deg = drag.origRot + ((a2 - a1) * 180) / Math.PI;
          if (shiftPressed) {
            deg = Math.round(deg / 15) * 15;
          }
          onUpdate({ rotation: deg });
        } else {
          void rect;
        }
        return;
      }

      if (drag.mode === "resize" && drag.handle) {
        const h = drag.handle;
        let newW = drag.origW;
        let newH = drag.origH;
        let newX = drag.origX;
        let newY = drag.origY;

        const rad = (drag.origRot * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dxRot = dxCss * cos + dyCss * sin;
        const dyRot = -dxCss * sin + dyCss * cos;

        if (h.includes("e")) newW = Math.max(minSize, drag.origW + dxRot);
        if (h.includes("s")) newH = Math.max(minSize, drag.origH + dyRot);
        if (h.includes("w")) {
          const delta = Math.min(drag.origW - minSize, -dxRot);
          newW = drag.origW - delta;
          const xLocalDelta = delta;
          const yLocalDelta = 0;
          newX =
            drag.origX +
            (xLocalDelta * Math.cos((drag.origRot * Math.PI) / 180) -
              yLocalDelta * Math.sin((drag.origRot * Math.PI) / 180));
          newY =
            drag.origY +
            (xLocalDelta * Math.sin((drag.origRot * Math.PI) / 180) +
              yLocalDelta * Math.cos((drag.origRot * Math.PI) / 180));
        }
        if (h.includes("n")) {
          const delta = Math.min(drag.origH - minSize, -dyRot);
          newH = drag.origH - delta;
          const xLocalDelta = 0;
          const yLocalDelta = delta;
          newX =
            drag.origX +
            (xLocalDelta * Math.cos((drag.origRot * Math.PI) / 180) -
              yLocalDelta * Math.sin((drag.origRot * Math.PI) / 180));
          newY =
            drag.origY +
            (xLocalDelta * Math.sin((drag.origRot * Math.PI) / 180) +
              yLocalDelta * Math.cos((drag.origRot * Math.PI) / 180));
        }

        onUpdate({ x: newX, y: newY, width: newW, height: newH });
      }
    },
    [minSize, onUpdate, scale],
  );

  const onWrapperPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    onWrapperMove(e.clientX, e.clientY, e.shiftKey);
  };

  const onWrapperPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const onDocUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointerup", onDocUp);
    window.addEventListener("pointercancel", onDocUp);
    return () => {
      window.removeEventListener("pointerup", onDocUp);
      window.removeEventListener("pointercancel", onDocUp);
    };
  }, []);

  return (
    <div
      data-transformer-rotate-metric
      onPointerMove={onWrapperPointerMove}
      onPointerUp={onWrapperPointerUp}
      onPointerCancel={onWrapperPointerUp}
      className="absolute"
      style={{
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        pointerEvents: "none",
      }}
    >
      <div
        onPointerDown={onBodyPointerDown}
        className="absolute will-change-transform"
        style={{
          transform: `translate3d(${x * scale}px, ${y * scale}px, 0) rotate(${rotation}deg)`,
          width: width * scale,
          height: height * scale,
          pointerEvents: "auto",
          touchAction: "none",
        }}
      >
        {children}
        {selected && (
          <>
            <div
              className="pointer-events-none absolute inset-0 border-2 rounded-sm"
              style={{ borderColor: accentColor }}
            />
            <Handle
              pos="nw"
              color={accentColor}
              onPointerDown={(e) => onHandlePointerDown(e, "nw")}
            />
            <Handle
              pos="n"
              color={accentColor}
              onPointerDown={(e) => onHandlePointerDown(e, "n")}
            />
            <Handle
              pos="ne"
              color={accentColor}
              onPointerDown={(e) => onHandlePointerDown(e, "ne")}
            />
            <Handle
              pos="e"
              color={accentColor}
              onPointerDown={(e) => onHandlePointerDown(e, "e")}
            />
            <Handle
              pos="se"
              color={accentColor}
              onPointerDown={(e) => onHandlePointerDown(e, "se")}
            />
            <Handle
              pos="s"
              color={accentColor}
              onPointerDown={(e) => onHandlePointerDown(e, "s")}
            />
            <Handle
              pos="sw"
              color={accentColor}
              onPointerDown={(e) => onHandlePointerDown(e, "sw")}
            />
            <Handle
              pos="w"
              color={accentColor}
              onPointerDown={(e) => onHandlePointerDown(e, "w")}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                top: height * scale + 8,
                width: 1,
                height: 24,
                backgroundColor: accentColor,
                opacity: 0.6,
              }}
            />
            <div
              onPointerDown={(e) => onHandlePointerDown(e, "rotate")}
              className="absolute left-1/2 -translate-x-1/2 rounded-full cursor-grab active:cursor-grabbing shadow-sm border-2 bg-white flex items-center justify-center focus-ring"
              style={{
                top: height * scale + 8 + 24 - HANDLE_SIZE,
                width: HANDLE_SIZE + 4,
                height: HANDLE_SIZE + 4,
                borderColor: accentColor,
                pointerEvents: "auto",
              }}
              aria-label="Rotate"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Handle({
  pos,
  color,
  onPointerDown,
}: {
  pos: TransformHandle;
  color: string;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const base: Record<string, string> = {
    position: "absolute",
    width: `${HANDLE_SIZE}px`,
    height: `${HANDLE_SIZE}px`,
    backgroundColor: "white",
    border: `2px solid ${color}`,
    borderRadius: "2px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
    cursor: grabCursor(pos),
    touchAction: "none",
  };

  const style: Record<string, React.CSSProperties> = {
    nw: { ...base, left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 },
    n: {
      ...base,
      left: `calc(50% - ${HANDLE_SIZE / 2}px)`,
      top: -HANDLE_SIZE / 2,
    },
    ne: { ...base, right: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 },
    e: {
      ...base,
      right: -HANDLE_SIZE / 2,
      top: `calc(50% - ${HANDLE_SIZE / 2}px)`,
    },
    se: { ...base, right: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 },
    s: {
      ...base,
      left: `calc(50% - ${HANDLE_SIZE / 2}px)`,
      bottom: -HANDLE_SIZE / 2,
    },
    sw: { ...base, left: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 },
    w: {
      ...base,
      left: -HANDLE_SIZE / 2,
      top: `calc(50% - ${HANDLE_SIZE / 2}px)`,
    },
  };

  return (
    <div
      style={style[pos]}
      onPointerDown={onPointerDown}
      className="active:cursor-grabbing cursor-grab focus-ring"
      aria-label={`${pos} handle`}
    />
  );
}

function grabCursor(pos: TransformHandle): string {
  switch (pos) {
    case "nw":
    case "se":
      return "nwse-resize";
    case "ne":
    case "sw":
      return "nesw-resize";
    case "n":
    case "s":
      return "ns-resize";
    case "e":
    case "w":
      return "ew-resize";
    case "rotate":
      return "grab";
    default:
      return "grab";
  }
}
