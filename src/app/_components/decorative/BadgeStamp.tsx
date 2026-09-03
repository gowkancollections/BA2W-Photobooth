"use client";

interface BadgeStampProps {
  children: React.ReactNode;
  className?: string;
  bg?: string;
  textColor?: string;
  rotate?: number;
  size?: "sm" | "md" | "lg";
}

export function BadgeStamp({
  children,
  className = "",
  bg = "var(--color-pink)",
  textColor = "var(--color-cream)",
  rotate = 0,
  size = "md",
}: BadgeStampProps) {
  const sizes = {
    sm: "w-14 h-14 md:w-16 md:h-16 text-[9px] md:text-[10px]",
    md: "w-20 h-20 md:w-24 md:h-24 text-[10px] md:text-xs",
    lg: "w-28 h-28 md:w-32 md:h-32 text-xs md:text-sm",
  };

  return (
    <div
      aria-hidden="true"
      className={`relative inline-flex items-center justify-center ${sizes[size]} rounded-full ${className}`}
      style={{
        transform: `rotate(${rotate}deg)`,
        background: bg,
        border: "3px solid var(--color-ink)",
        boxShadow: "3px 3px 0 var(--color-ink)",
        color: textColor,
      }}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.4"
        />
      </svg>
      <span
        className="font-body font-bold leading-tight text-center uppercase tracking-wider px-1"
        style={{ letterSpacing: "0.05em" }}
      >
        {children}
      </span>
    </div>
  );
}
