"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Download,
  Globe,
  Smartphone,
  ShieldCheck,
  Zap,
  ImageIcon,
} from "lucide-react";

function resolveApkUrl(): string {
  const fromEnv = String(process.env.NEXT_PUBLIC_ANDROID_APK_URL || "").trim();
  if (fromEnv) return fromEnv;

  const api = String(process.env.NEXT_PUBLIC_API_URL || "").trim();
  try {
    if (api) {
      const origin = new URL(api).origin;
      return `${origin}/downloads/MetaTrader5.apk`;
    }
  } catch {
    /* ignore */
  }
  return "/downloads/MetaTrader5.apk";
}

const SCREENSHOT_SLOTS = 3;

export default function TradingPlatformPage() {
  const router = useRouter();
  const apkUrl = resolveApkUrl();

  return (
    <div className="min-h-screen bg-[var(--bg-main)] pb-24 md:pb-10">
      <div className="mx-auto w-full max-w-5xl space-y-5 px-3 py-4 md:space-y-6 md:px-6 md:py-6">
        {/* Hero */}
        <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-sm">
          <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:gap-8 md:p-8">
            <div className="mx-auto flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-[var(--border-soft)] bg-[var(--primary-soft)] shadow-sm md:mx-0 md:h-32 md:w-32">
              <Image
                src="/oceanaprofx-logo.png"
                alt="Oceanaprofx"
                width={128}
                height={128}
                className="h-full w-full object-contain p-3"
                priority
              />
            </div>

            <div className="min-w-0 flex-1 text-center md:text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                Oceanaprofx Trading
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[var(--text-main)] md:text-3xl">
                Trading Platform
              </h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)] md:text-[15px]">
                Download the Android app for on-the-go trading, or open the web
                terminal in your browser.
              </p>

              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center md:justify-start">
                <a
                  href={apkUrl}
                  download
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
                >
                  <Download size={17} />
                  Download for Android
                </a>

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

        {/* Android app card */}
        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 shadow-sm md:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <Smartphone size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--text-main)]">
                Android App
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Install the Oceanaprofx Android APK to trade from your phone.
                After download, open the file and allow installation from this
                source if prompted.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Feature
              icon={<Zap size={16} />}
              title="Fast execution"
              text="Place and manage orders quickly on mobile."
            />
            <Feature
              icon={<ShieldCheck size={16} />}
              title="Secure login"
              text="Trade with your Oceanaprofx account credentials."
            />
            <Feature
              icon={<Smartphone size={16} />}
              title="Android only"
              text="Optimized for Android phones and tablets."
            />
          </div>

          <a
            href={apkUrl}
            download
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] sm:w-auto sm:px-6"
          >
            <Download size={17} />
            Download Android APK
          </a>
        </section>

        {/* Screenshots — empty slots for images you'll add */}
        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 shadow-sm md:p-6">
          <h2 className="text-lg font-semibold text-[var(--text-main)]">
            App Screenshots
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Preview images will appear here once added.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Array.from({ length: SCREENSHOT_SLOTS }).map((_, i) => (
              <div
                key={`shot-${i}`}
                className="flex aspect-[9/16] max-h-[420px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-main)] text-[var(--text-muted)]"
              >
                <ImageIcon size={28} strokeWidth={1.5} />
                <span className="text-xs font-medium">Screenshot {i + 1}</span>
                <span className="px-3 text-center text-[10px] text-[var(--text-placeholder)]">
                  Image placeholder
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Web trade */}
        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <Globe size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-main)]">
                  Web Trade Platform
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
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
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-main)] p-3">
      <div className="flex items-center gap-2 text-[var(--primary)]">
        {icon}
        <span className="text-sm font-semibold text-[var(--text-main)]">
          {title}
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">
        {text}
      </p>
    </div>
  );
}
