"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Props {
  onFinish: () => void;
}

export default function AppIntro({ onFinish }: Props) {
  const [fadeOut, setFadeOut] = useState(false);

  const handleEnd = () => {
    setFadeOut(true);
    setTimeout(() => {
      onFinish();
    }, 800); // Increased for smoother fade
  };

  useEffect(() => {
    // No text animation to wait for — finish after the logo entrance.
    const t = setTimeout(handleEnd, 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFinish]);

 return (
  <div
    className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden
    bg-[var(--bg-main)] transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]
    ${fadeOut ? "opacity-0 scale-[0.96] blur-sm" : "opacity-100 scale-100"}
    `}
  >
    {/* Subtle depth gradient background */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,var(--primary-glow),transparent_60%)] opacity-40" />

    {/* Soft noise texture layer */}
    <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none " />

    <div className="relative flex flex-col items-center text-center">

      {/* LOGO */}
      <div className="relative mb-14 animate-logoEntrance">

        {/* Controlled glow */}
        <div className="absolute inset-0 rounded-[2rem] bg-[var(--primary-glow)] blur-[60px] opacity-60 animate-glowControlled" />

        <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#eef4ff_0%,#f7faff_45%,#e8f0ff_100%)] px-6 py-4 shadow-[0_0_14px_rgba(61,123,255,0.28),0_0_28px_rgba(61,123,255,0.14)] ring-1 ring-[#3d7bff]/25">
          <Image
            src="/oceana-pro-fx-wave-logo-light.png?v=web-match-1"
            alt="Oceana Pro Fx"
            width={2110}
            height={400}
            priority
            unoptimized
            className="h-12 w-auto max-w-[min(260px,72vw)] object-contain drop-shadow-[0_0_6px_rgba(61,123,255,0.25)] sm:h-14"
          />
        </div>

        {/* Light sweep */}
        <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
          <div className="absolute w-1/3 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent# skew-x-12 animate-lightSweep" />
        </div>
      </div>

    </div>
  </div>
);
}
