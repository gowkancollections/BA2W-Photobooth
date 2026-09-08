import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { PhotoboothProvider } from "@/app/_providers/photobooth-provider";

export const metadata: Metadata = {
  title: "BA2W Photobooth - Korean Style Photo Strips Online",
  description:
    "Buat photo strip aesthetic ala Korean photobooth langsung di browser. Pilih layout, motret, edit, download — 100% private, tanpa upload ke server.",
  keywords: [
    "photobooth online",
    "korean photobooth",
    "photo strip",
    "life4cuts",
    "photoism",
    "freehihi",
  ],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF7ED" },
  ],
  openGraph: {
    title: "BA2W Photobooth",
    description: "Korean style photo strips online — private, fast, no signup.",
    type: "website",
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-dvh w-full overflow-x-hidden">
        <PhotoboothProvider>{children}</PhotoboothProvider>
      <Script src="/gowkan-badge.js" strategy="afterInteractive" /> 
      </body>
    </html>
  );
}
