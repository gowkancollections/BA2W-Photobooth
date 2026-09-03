"use client";

import { Camera, Square, Sparkle, Download, Star, ShieldCheck, Lightning, FilmStrip, HandPointing } from "@phosphor-icons/react";
import { usePhotobooth } from "@/app/_providers/photobooth-provider";
import { CloudDivider } from "@/app/_components/decorative/CloudDivider";
import { HalftoneDots } from "@/app/_components/decorative/HalftoneDots";
import { RibbonWave } from "@/app/_components/decorative/RibbonWave";
import { BadgeStamp } from "@/app/_components/decorative/BadgeStamp";

export function IntroStep() {
  const { nextStep } = usePhotobooth();

  return (
    <section className="relative min-h-dvh w-full overflow-x-visible overflow-y-visible px-4 py-8 md:py-14 flex flex-col items-center">
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10 inset-0">
        <div className="absolute -top-6 -left-8 w-52 h-72 md:w-72 md:h-96 opacity-50">
          <HalftoneDots color="var(--color-terracotta)" opacity={0.28} spacing={11} dotSize={3.5} />
        </div>
        <div className="absolute top-40 -right-10 w-60 h-60 md:w-80 md:h-80 opacity-40">
          <HalftoneDots color="var(--color-teal)" opacity={0.22} spacing={13} dotSize={4} />
        </div>
        <div className="absolute -bottom-16 -left-4 w-64 h-64 md:w-80 md:h-80 opacity-35">
          <HalftoneDots color="var(--color-pink)" opacity={0.2} spacing={12} dotSize={3.5} />
        </div>
        <div className="absolute bottom-32 right-0 w-48 h-56 md:w-64 md:h-72 opacity-25">
          <HalftoneDots color="var(--color-mustard)" opacity={0.25} spacing={14} dotSize={3} />
        </div>

        <div className="retro-sticker-dot absolute top-14 right-[10%] w-14 h-14 md:w-16 md:h-16 rotate-[-10deg] bg-accent-100" style={{borderColor: '#DB2777', boxShadow: '3px 3px 0 0 #DB2777'}}>
          <span className="text-[11px] md:text-xs font-bold text-accent-600 leading-none text-center">SMILE! <Star size={12} weight="fill" className="mx-auto mt-0.5" /></span>
        </div>
        <div className="retro-sticker-dot absolute top-[30%] left-[6%] w-11 h-11 md:w-14 md:h-14 rotate-[8deg] bg-secondary-200" style={{borderColor: '#D97706', boxShadow: '2.5px 2.5px 0 0 #D97706'}}>
          <Star size={20} weight="fill" className="text-secondary-700" />
        </div>
        <div className="retro-sticker-dot absolute bottom-44 right-[8%] w-12 h-12 md:w-14 md:h-14 rotate-[12deg] bg-primary-100" style={{borderColor: '#9B0A14', boxShadow: '2.5px 2.5px 0 0 #9B0A14'}}>
          <span className="text-[10px] md:text-[11px] font-bold text-primary-700 leading-none text-center">RETRO<br/>VIBES</span>
        </div>
        <div className="retro-sticker-dot absolute bottom-64 left-[10%] w-10 h-10 md:w-12 md:h-12 rotate-[-14deg] bg-secondary-200" style={{borderColor: '#D97706', boxShadow: '2px 2px 0 0 #D97706'}}>
          <FilmStrip size={18} weight="fill" className="text-secondary-700" />
        </div>

        <span className="absolute top-24 left-[24%] w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-accent-500 border-2 border-[#3D2914] animate-float-slow shadow-retro-sm" />
        <span className="absolute top-[42%] right-[26%] w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full bg-mustard border-2 border-[#3D2914] animate-float-fast [animation-delay:-1.8s] shadow-retro-sm" style={{backgroundColor: 'var(--color-mustard)'}} />
        <span className="absolute bottom-52 right-[34%] w-2 h-2 md:w-3 md:h-3 rounded-full bg-teal border-2 border-[#3D2914] animate-float-slow [animation-delay:-4.2s] shadow-retro-sm" style={{backgroundColor: 'var(--color-teal)'}} />
        <span className="absolute top-[68%] left-[20%] w-3 h-3 md:w-3.5 md:h-3.5 rounded-full bg-lavender border-2 border-[#3D2914] animate-float-fast [animation-delay:-2.5s] shadow-retro-sm" style={{backgroundColor: 'var(--color-lavender)'}} />
      </div>

      <div className="w-full max-w-3xl md:max-w-5xl xl:max-w-6xl relative z-10 mx-auto">
        <header className="text-center mb-7 md:mb-10 relative px-2">
          <div className="flex justify-center mb-5 md:mb-7 relative">
            <div className="retro-badge-mustard inline-flex items-center gap-2 backdrop-blur-sm">
              <Sparkle
                size={16}
                className="-mt-0.5"
                weight="fill"
                aria-hidden="true"
              />
              <span className="text-[10px] sm:text-xs md:text-[11px] text-uppercase-badge">
                RETRO PHOTOBOOTH · 100% CLIENT-SIDE
              </span>
            </div>
            <div className="absolute -top-2 -right-2 sm:-right-10 md:-top-4 md:-right-8 z-20">
              <BadgeStamp bg="var(--color-pink)" rotate={-14} size="sm">
                EST.<br/>2026
              </BadgeStamp>
            </div>
          </div>

          <div className="relative inline-block mb-5 md:mb-6 w-full max-w-4xl mx-auto">
            <div className="absolute -bottom-2 md:-bottom-3 left-0 right-0 -z-0 translate-y-1 opacity-100">
              <RibbonWave />
            </div>
            <h1 className="heading-bubble text-[2.4rem] sm:text-[3.5rem] md:text-[5rem] xl:text-[6.5rem] leading-[0.9] relative z-10 tracking-tight text-center whitespace-nowrap overflow-visible break-words normal-case">
              BA2W
              <span className="block mt-1 md:mt-2">
                <span className="heading-bubble-mustard">PHOTO</span>
                <span className="heading-bubble-pink">BOOTH</span>
              </span>
            </h1>
          </div>

          <div className="max-w-2xl lg:max-w-3xl mx-auto">
            <p className="font-body text-base sm:text-lg md:text-xl text-foreground/90 leading-relaxed">
              Pengen foto strip gaya <span className="font-accent-hand text-xl sm:text-2xl md:text-3xl font-bold" style={{color: 'var(--color-pink)'}}>zine vintage</span> buat acara atau sekedar iseng? 📸✨
            </p>
            <p className="font-body text-sm sm:text-base md:text-lg text-foreground/75 mt-3 md:mt-4 leading-relaxed max-w-2xl mx-auto">
              Pilih frame, motret bareng temen, hias dengan sticker & drag foto sesuka hati — 
              <span className="font-accent-serif italic md:text-xl font-semibold block md:inline" style={{color: 'var(--color-terracotta)'}}> 
                semua di browser-mu aja.
              </span>
              <span className="inline-flex items-center mt-2 md:mt-0 md:ml-2 gap-1">
                <ShieldCheck size={14} weight="fill" style={{color: 'var(--color-teal)'}} />
                <span className="font-bold" style={{color: 'var(--color-teal)'}}>0 upload · 0 server · 100% privat.</span>
              </span>
            </p>
          </div>
        </header>

        <div className="flex flex-col items-center mb-10 md:mb-12">
          <button
            onClick={nextStep}
            className="retro-btn-mustard text-lg sm:text-xl md:text-2xl px-10 md:px-20 py-4 md:py-6 focus-ring inline-flex items-center gap-3 md:gap-4 animate-pop"
          >
            <HandPointing size={24} weight="fill" />
            <span className="text-uppercase-badge tracking-widest">MULAIN SEKARANG!</span>
            <span aria-hidden="true" className="font-black text-xl md:text-2xl">→</span>
          </button>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 md:gap-x-6 gap-y-2 text-[10px] sm:text-xs md:text-[11px] text-foreground/70 font-bold tracking-widest uppercase">
            <span className="inline-flex items-center gap-1.5"><Lightning size={12} weight="fill" style={{color: 'var(--color-mustard)'}}/> INSTAN</span>
            <span>·</span>
            <span>NO SIGNUP</span>
            <span>·</span>
            <span>NO INSTALL</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={12} weight="fill" style={{color: 'var(--color-teal)'}}/> PRIVAT</span>
          </div>
        </div>

        <div className="relative -mx-4 md:-mx-12 xl:-mx-16 mb-5 md:mb-7">
          <CloudDivider color="var(--color-lavender)" />
        </div>

        <section className="grid gap-3 md:gap-5 mb-7 md:mb-9 relative" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div className="absolute -top-4 -left-3 z-20">
            <BadgeStamp bg="var(--color-mustard)" textColor="var(--color-ink)" rotate={-9} size="sm">
              ✦ FITUR
            </BadgeStamp>
          </div>
          <FeatureCard
            icon={<Camera size={28} weight="fill" />}
            title="Capture Langsung!"
            desc="Pakai kamera front/back dari device-mu, filter kekinian, countdown 3-2-1 otomatis anti buru-buru."
            badge="red"
            rotate={-1.5}
          />
          <FeatureCard
            icon={<Square size={28} weight="fill" />}
            title="Frame + Editor Pro"
            desc="Pilihan frame retro style yang makin aesthetic. Drag, resize, rotate foto di tiap slot seenaknya!"
            badge="mustard"
            rotate={1.8}
          />
          <FeatureCard
            icon={<Download size={28} weight="fill" />}
            title="Export HD Jernih"
            desc="Hasil render sesuai resolusi asli frame — TANPA watermark, TANPA ngurangin kualitas. Langsung save!"
            badge="pink"
            rotate={-0.8}
          />
          <FeatureCard
            icon={<ShieldCheck size={28} weight="fill" />}
            title="Privasi Terjamin"
            desc="Tidak ada upload ke server manapun. Canvas API + client-side rendering 100% — fotomu tetap di tanganmu."
            badge="teal"
            rotate={1.2}
          />
        </section>

        <div className="relative -mx-4 md:-mx-12 xl:-mx-16 mb-6 md:mb-8">
          <CloudDivider color="var(--color-teal)" direction="bottom" />
        </div>

        <div className="retro-card p-6 md:p-8 relative overflow-hidden max-w-4xl mx-auto" style={{backgroundColor: 'var(--color-cream)'}}>
          <div aria-hidden className="absolute -top-10 -right-10 w-48 h-48 opacity-30">
            <HalftoneDots color="var(--color-terracotta)" opacity={0.25} spacing={10} dotSize={3} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-5 md:gap-8 text-center md:text-left">
            <div className="flex-shrink-0 w-20 h-20 md:w-28 md:h-28 rounded-full border-[3px] flex items-center justify-center" style={{backgroundColor: 'var(--color-mustard)', borderColor: 'var(--color-ink)', boxShadow: '4px 4px 0 var(--color-ink)'}}>
              <FilmStrip size={36} weight="fill" style={{color: 'var(--color-ink)'}} />
            </div>
            <div className="flex-1 max-w-xl">
              <p className="heading-bubble-mustard text-2xl md:text-3xl xl:text-4xl leading-tight !text-stroke-ink-sm">
                <span className="font-accent-hand text-2xl md:text-4xl" style={{color: 'var(--color-pink)'}}>&ldquo;Kenang-kenangan</span> dalam 4 potret!&rdquo;
              </p>
              <p className="text-xs sm:text-sm md:text-base text-foreground/70 mt-2 md:mt-3 font-body">
                Captured by you, styled by BA2W — moments that stick, literally (thanks to our stickers 😉).
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  badge,
  rotate = 0,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge: "red" | "mustard" | "pink" | "teal";
  rotate?: number;
}) {
  const badgeStyles: Record<string, string> = {
    red: "from-primary-400 to-primary-600 border-primary-700",
    mustard: "from-secondary-300 to-secondary-500 border-secondary-600",
    pink: "from-accent-300 to-accent-500 border-accent-600",
    teal: "from-[#5CC8D8] to-[#3AB6C9] border-[#1F7A87]",
  };

  return (
    <div
      className="retro-card p-5 flex flex-col items-start gap-3 paper-edge"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div
        className={`w-13 h-13 md:w-14 md:h-14 rounded-2xl border-[3px] border-[#3D2914] flex items-center justify-center shadow-retro-sm bg-gradient-to-br ${badgeStyles[badge]}`}
      >
        <div className="text-white drop-shadow-[1px_1px_0_rgba(61,41,20,0.6)]">
          {icon}
        </div>
      </div>
      <h3 className="font-heading text-heading-retro text-xl text-foreground leading-tight">
        {title}
      </h3>
      <p className="text-xs md:text-sm text-foreground/80 leading-relaxed font-body">
        {desc}
      </p>
    </div>
  );
}
