import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#E63946",
          foreground: "#FFF8E7",
          50: "#FFF1F2",
          100: "#FFE0E3",
          200: "#FFC5CA",
          300: "#FF9AA2",
          400: "#F45B69",
          500: "#E63946",
          600: "#C1121F",
          700: "#9B0A14",
        },
        secondary: {
          DEFAULT: "#F4A300",
          foreground: "#3D2914",
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F4A300",
          600: "#D97706",
        },
        accent: {
          DEFAULT: "#EC4899",
          foreground: "#FFF8E7",
          50: "#FDF2F8",
          100: "#FCE7F3",
          200: "#FBCFE8",
          300: "#F9A8D4",
          400: "#F472B6",
          500: "#EC4899",
          600: "#DB2777",
        },
        brown: {
          DEFAULT: "#6B3F1D",
          foreground: "#FFF8E7",
          50: "#FBF5EE",
          100: "#F3E3C9",
          200: "#E6C79A",
          300: "#D4A36A",
          400: "#BE7F3E",
          500: "#8B5A2B",
          600: "#6B3F1D",
        },
        cream: {
          DEFAULT: "#FFF8E7",
          foreground: "#3D2914",
          50: "#FFFDF5",
          100: "#FFFBEE",
          200: "#FFF8E7",
          300: "#F7EBD0",
        },
        background: "#FFF8E7",
        foreground: "#3D2914",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#3D2914",
        },
        muted: {
          DEFAULT: "#F7EBD0",
          foreground: "#8B5A2B",
        },
        border: "#BE7F3E",
        destructive: {
          DEFAULT: "#E63946",
          foreground: "#FFF8E7",
        },
        ring: "#E63946",
      },
      fontFamily: {
        display: ['"Bebas Neue"', '"Oswald"', '"Fredoka"', "sans-serif"],
        heading: ['"Archivo Black"', '"Bebas Neue"', "sans-serif"],
        body: ['"Nunito"', '"Fredoka"', "sans-serif"],
        sticker: ['"Fredoka"', '"Bubblegum Sans"', "cursive"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
        "5xl": "2.5rem",
        stamp: "38% 62% 63% 37% / 41% 44% 56% 59%",
        cloud: "50% 50% 40% 60% / 60% 55% 45% 40%",
        blob: "42% 58% 70% 30% / 45% 45% 55% 55%",
        "blob-alt": "58% 42% 30% 70% / 55% 55% 45% 45%",
      },
      boxShadow: {
        retro: "4px 4px 0 0 #3D2914",
        "retro-lg": "6px 6px 0 0 #3D2914",
        "retro-xl": "8px 8px 0 0 #3D2914",
        "retro-sm": "2px 2px 0 0 #3D2914",
        "retro-pink": "4px 4px 0 0 #EC4899",
        "retro-mustard": "4px 4px 0 0 #F4A300",
        paper: "0 1px 3px rgba(61, 41, 20, 0.08), 0 4px 12px rgba(61, 41, 20, 0.06)",
      },
      backgroundImage: {
        "retro-gradient":
          "linear-gradient(135deg, #FFF8E7 0%, #FFE0E3 40%, #FEF3C7 80%, #FFF8E7 100%)",
        "paper-texture":
          "radial-gradient(circle at 20% 30%, rgba(139, 90, 43, 0.04) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(230, 57, 70, 0.04) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(244, 163, 0, 0.03) 0%, transparent 60%)",
        "halftone-dots":
          "radial-gradient(circle, #3D2914 1px, transparent 1px)",
      },
      animation: {
        "float-slow": "floatSlow 8s ease-in-out infinite",
        "float-fast": "floatFast 5s ease-in-out infinite",
        "spin-slow": "spin 14s linear infinite",
        "jitter": "jitter 0.4s ease-in-out infinite",
        "sticker-pop": "stickerPop 0.3s ease-out",
      },
      keyframes: {
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px) rotate(-2deg)" },
          "50%": { transform: "translateY(-12px) rotate(2deg)" },
        },
        floatFast: {
          "0%, 100%": { transform: "translateY(0px) rotate(3deg)" },
          "33%": { transform: "translateY(-8px) rotate(-4deg)" },
          "66%": { transform: "translateY(5px) rotate(2deg)" },
        },
        jitter: {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
          "25%": { transform: "translate(-0.5px, 0.5px) rotate(-0.5deg)" },
          "75%": { transform: "translate(0.5px, -0.5px) rotate(0.5deg)" },
        },
        stickerPop: {
          "0%": { transform: "scale(0.6) rotate(-8deg)", opacity: "0" },
          "60%": { transform: "scale(1.1) rotate(3deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
