"use client";

interface CloudDividerProps {
  className?: string;
  color?: string;
  direction?: "top" | "bottom";
}

export function CloudDivider({
  className = "",
  color = "var(--color-mustard)",
  direction = "top",
}: CloudDividerProps) {
  return (
    <svg
      viewBox="0 0 1200 60"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`w-full h-8 md:h-12 block ${className}`}
      style={direction === "bottom" ? { transform: "scaleY(-1)" } : undefined}
    >
      <path
        d="M0,30 
           Q60,5 120,30 
           Q180,55 240,30 
           Q300,5 360,30 
           Q420,55 480,30 
           Q540,5 600,30 
           Q660,55 720,30 
           Q780,5 840,30 
           Q900,55 960,30 
           Q1020,5 1080,30 
           Q1140,55 1200,30 
           L1200,60 L0,60 Z"
        fill={color}
        stroke="var(--color-ink)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
