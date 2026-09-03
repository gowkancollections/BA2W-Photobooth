"use client";

interface RibbonWaveProps {
  className?: string;
  colorFrom?: string;
  colorTo?: string;
}

export function RibbonWave({
  className = "",
  colorFrom = "var(--color-teal)",
  colorTo = "var(--color-pink)",
}: RibbonWaveProps) {
  const gradientId = `ribbon-grad-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <svg
      viewBox="0 0 600 80"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`w-full h-4 md:h-6 block ${className}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colorFrom} />
          <stop offset="50%" stopColor="var(--color-mustard)" />
          <stop offset="100%" stopColor={colorTo} />
        </linearGradient>
      </defs>
      <path
        d="M0,40 
           C50,10 100,70 150,40 
           C200,10 250,70 300,40 
           C350,10 400,70 450,40 
           C500,10 550,70 600,40 
           L600,55 
           C550,85 500,25 450,55 
           C400,85 350,25 300,55 
           C250,85 200,25 150,55 
           C100,85 50,25 0,55 Z"
        fill={`url(#${gradientId})`}
        stroke="var(--color-ink)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
