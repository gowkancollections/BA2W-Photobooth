"use client";

interface HalftoneDotsProps {
  className?: string;
  color?: string;
  opacity?: number;
  dotSize?: number;
  spacing?: number;
}

export function HalftoneDots({
  className = "",
  color = "var(--color-ink)",
  opacity = 0.12,
  dotSize = 4,
  spacing = 14,
}: HalftoneDotsProps) {
  const w = 400;
  const h = 400;
  const circles = [];
  for (let y = 0; y < h; y += spacing) {
    for (let x = 0; x < w; x += spacing) {
      const offset = (y / spacing) % 2 === 0 ? 0 : spacing / 2;
      circles.push(
        <circle
          key={`${x}-${y}`}
          cx={x + offset}
          cy={y}
          r={dotSize / 2}
          fill={color}
        />,
      );
    }
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
      style={{ opacity }}
    >
      {circles}
    </svg>
  );
}
