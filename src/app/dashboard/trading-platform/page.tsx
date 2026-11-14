"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Globe,
  Smartphone,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";

/** Android APK is published; downloads link to the backend-hosted APK. */
const APP_AVAILABLE = true;

const DEFAULT_APK_URL =
  "https://mt5-api.blackossoftwaresolution.in/downloads/OceanaProFx%20.apk";

function resolveApkUrl(): string {
  const fromEnv = String(process.env.NEXT_PUBLIC_ANDROID_APK_URL || "").trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_APK_URL;
}

const SCREENSHOTS = [
  { src: "/1.png", alt: "Oceanaprofx app — welcome screen" },
  { src: "/2.png", alt: "Oceanaprofx app — screen 2" },
  { src: "/3.png", alt: "Oceanaprofx app — screen 3" },
  { src: "/4.png", alt: "Oceanaprofx app — screen 4" },
  { src: "/5.png", alt: "Oceanaprofx app — screen 5" },
];
/** Source screenshots are 1290 × 2796. */
const SHOT_W = 1290;
const SHOT_H = 2796;

export default function TradingPlatformPage() {
  const router = useRouter();
  const apkUrl = resolveApkUrl();
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);

  const downloadButton = (label: string, className: string) =>
    APP_AVAILABLE ? (
      <a href={apkUrl} download className={className}>
        <Download size={17} />
        {label}
      </a>
    ) : (
      <button type="button" onClick={() => setComingSoonOpen(true)} className={className}>
        <Download size={17} />
        {label}
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
          Soon
        </span>
      </button>
    );

  return (
    <div className="min-h-screen bg-[var(--bg-main)] pb-24 md:pb-10">
      <div className="mx-auto w-full min-w-0 max-w-5xl space-y-4 px-2 py-3 sm:space-y-5 sm:px-3 sm:py-4 md:space-y-6 md:px-6 md:py-6">
        {/* Hero */}
        <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-sm">
          <div className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-5 md:flex-row md:items-center md:gap-8 md:p-8">
            <div className="mx-auto flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-[var(--border-soft)] bg-white shadow-sm sm:h-28 sm:w-28 md:mx-0 md:h-32 md:w-32">
              <Image
                src="/oceanaprofx-icon.png?v=emblem-20261114"
                alt="Oceanaprofx"
                width={128}
                height={128}
                className="h-full w-full object-contain p-3"
                priority
              />
            </div>

            <div className="min-w-0 flex-1 text-center md:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--primary)] sm:text-xs">
                Oceanaprofx Trading
              </p>
              <h1 className="mt-1 text-xl font-bold text-[var(--text-main)] sm:text-2xl md:text-3xl">
                Trading Platform
              </h1>
              <p className="mt-2 text-[13px] text-[var(--text-secondary)] sm:text-sm md:text-[15px]">
                Trade on the go with the Android app, or open the web terminal in your browser.
              </p>

              {!APP_AVAILABLE ? (
                <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-600 md:mx-0">
                  <Clock3 size={13} />
                  Android app launching in a few days
                </p>
              ) : null}

              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center md:justify-start">
                {downloadButton(
                  "Download for Android",
                  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]",
                )}

                <button
                  type="button"
                  onClick={() => router.push("/trade-open")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--primary)] bg-[var(--bg-card)] px-5 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]"
                >
                  <Globe size={17} />
                  Web Trade Platform
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Screenshots */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-3 shadow-sm sm:p-4 md:p-6">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[var(--text-main)] sm:text-lg">App Screenshots</h2>
              <p className="mt-0.5 text-[12px] text-[var(--text-muted)] sm:text-sm">
                A quick look at the Oceanaprofx mobile app.
              </p>
            </div>
            <span className="shrink-0 text-[11px] text-[var(--text-muted)] md:hidden">Swipe →</span>
          </div>

          {/* Phones/tablets: swipeable row. Desktop: all five in one row. */}
          <div className="-mx-3 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:-mx-4 sm:px-4 md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
            {SCREENSHOTS.map((shot, i) => (
              <button
                key={shot.src}
                type="button"
                onClick={() => setPreview(i)}
                aria-label={`Open screenshot ${i + 1}`}
                className="group relative w-[58%] shrink-0 snap-center overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[#21252d] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg min-[420px]:w-[44%] sm:w-[31%] md:w-auto"
              >
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  width={SHOT_W}
                  height={SHOT_H}
                  sizes="(min-width: 768px) 190px, (min-width: 640px) 31vw, (min-width: 420px) 44vw, 58vw"
                  className="h-auto w-full"
                  loading={i < 2 ? "eager" : "lazy"}
                />
                <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
              </button>
            ))}
          </div>
        </section>

        {/* Android app card */}
        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-3 shadow-sm sm:p-4 md:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <Smartphone size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[var(--text-main)] sm:text-lg">Android App</h2>
              <p className="mt-1 text-[13px] text-[var(--text-secondary)] sm:text-sm">
                Install the Oceanaprofx Android app to trade from your phone. After download, open the file and allow installation from this source if prompted.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Feature icon={<Zap size={16} />} title="Fast execution" text="Place and manage orders quickly on mobile." />
            <Feature
              icon={<ShieldCheck size={16} />}
              title="Secure login"
              text="Trade with your Oceanaprofx account credentials."
            />
            <Feature icon={<Smartphone size={16} />} title="Android only" text="Optimized for Android phones and tablets." />
          </div>

          {downloadButton(
            "Download Android APK",
            "mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] sm:w-auto sm:px-6",
          )}
        </section>

        {/* Web trade */}
        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-3 shadow-sm sm:p-4 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <Globe size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[var(--text-main)] sm:text-lg">Web Trade Platform</h2>
                <p className="mt-1 text-[13px] text-[var(--text-secondary)] sm:text-sm">
                  No install needed — trade directly in your browser.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/trade-open")}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--primary)] bg-[var(--bg-card)] px-5 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]"
            >
              <Globe size={17} />
              Open Web Terminal
            </button>
          </div>
        </section>
      </div>

      {comingSoonOpen ? (
        <ComingSoonModal
          onClose={() => setComingSoonOpen(false)}
          onWebTerminal={() => {
            setComingSoonOpen(false);
            router.push("/trade-open");
          }}
        />
      ) : null}

      {preview !== null ? (
        <ScreenshotViewer index={preview} onChange={setPreview} onClose={() => setPreview(null)} />
      ) : null}
    </div>
  );
}

function ComingSoonModal({ onClose, onWebTerminal }: { onClose: () => void; onWebTerminal: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coming-soon-title"
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 text-center shadow-2xl"
      >
        <span className="pointer-events-none absolute -top-16 left-1/2 h-32 w-48 -translate-x-1/2 rounded-full bg-[var(--primary)]/25 blur-3xl" />
        <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <Smartphone size={26} />
        </div>
        <h3 id="coming-soon-title" className="relative mt-4 text-base font-semibold text-[var(--text-main)] sm:text-lg">
          Android app coming soon
        </h3>
        <p className="relative mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          The Oceanaprofx app will be available to download in a few days. Please check back then — meanwhile you can
          trade from the web terminal.
        </p>
        <div className="relative mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-[var(--border-soft)] text-sm font-semibold text-[var(--text-main)] transition hover:bg-[var(--bg-glass)]"
          >
            Okay
          </button>
          <button
            type="button"
            onClick={onWebTerminal}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
          >
            <Globe size={15} />
            Web terminal
          </button>
        </div>
      </div>
    </div>
  );
}

function ScreenshotViewer({
  index,
  onChange,
  onClose,
}: {
  index: number;
  onChange: (next: number) => void;
  onClose: () => void;
}) {
  const total = SCREENSHOTS.length;
  const go = (dir: 1 | -1) => onChange((index + dir + total) % total);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onChange((index + 1) % total);
      if (e.key === "ArrowLeft") onChange((index - 1 + total) % total);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, onChange, onClose, total]);

  const shot = SCREENSHOTS[index];

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close preview" onClick={onClose} className="absolute inset-0" />

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <X size={18} />
      </button>

      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Previous screenshot"
        className="absolute left-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-6"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="relative z-[1] h-[min(86vh,820px)] max-w-[calc(100vw-6rem)]" style={{ aspectRatio: `${SHOT_W} / ${SHOT_H}` }}>
        <Image
          key={shot.src}
          src={shot.src}
          alt={shot.alt}
          fill
          sizes="(min-width: 768px) 400px, 80vw"
          className="rounded-2xl object-contain"
          priority
        />
      </div>

      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next screenshot"
        className="absolute right-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6"
      >
        <ChevronRight size={20} />
      </button>

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
        {SCREENSHOTS.map((s, i) => (
          <button
            key={s.src}
            type="button"
            onClick={() => onChange(i)}
            aria-label={`Show screenshot ${i + 1}`}
            className={`h-2 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-2 bg-white/40"}`}
          />
        ))}
      </div>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-main)] p-3">
      <div className="flex items-center gap-2 text-[var(--primary)]">
        {icon}
        <span className="text-sm font-semibold text-[var(--text-main)]">{title}</span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">{text}</p>
    </div>
  );
}
