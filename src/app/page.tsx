"use client";

import { usePhotobooth } from "@/app/_providers/photobooth-provider";
import { IntroStep } from "@/app/_steps/intro-step";
import { ChooseFrameStep } from "@/app/_steps/choose-frame-step";
import { CameraStep } from "@/app/_steps/camera-step";
import { EditorStep } from "@/app/_steps/editor-step";
import { STEP_ORDER } from "@/types/photobooth";

export default function HomePage() {
  const { step } = usePhotobooth();
  return (
    <div className="relative min-h-dvh w-full desktop-deco-bg">
      <div className="w-full relative">
        <StepperBar current={step} />
        <div key={step} className="animate-[fadeIn_.18s_ease-out]">
          {step === "intro" && <IntroStep />}
          {step === "choose-frame" && <ChooseFrameStep />}
          {step === "camera" && <CameraStep />}
          {step === "editor" && <EditorStep />}
        </div>
      </div>
    </div>
  );
}

function StepperBar({ current }: { current: typeof STEP_ORDER[number] }) {
  const idx = STEP_ORDER.indexOf(current);
  if (idx <= 0) return null;
  const visible = STEP_ORDER.slice(1);
  return (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b-[3px] border-border/40 px-4 py-2.5">
      <div className="w-full max-w-md md:max-w-5xl mx-auto flex items-center gap-2">
        {visible.map((s, i) => {
          const globalIdx = i + 1;
          const done = globalIdx < idx;
          const active = globalIdx === idx;
          return (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-all border-[1.5px] ${
                done
                  ? "bg-primary border-primary-700"
                  : active
                    ? "bg-secondary-500 border-secondary-700 animate-pulse"
                    : "bg-border border-border/60"
              }`}
              aria-hidden={!active}
            />
          );
        })}
      </div>
    </div>
  );
}
