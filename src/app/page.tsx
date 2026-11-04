"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppIntro from "./components/AppIntro";

const INTRO_KEY = "oceanaprofx-intro-shown";

/**
 * Entry point: plays the startup animation once per session, then goes straight to
 * /login (middleware forwards logged-in users on to /dashboard).
 */
export default function Home() {
  const router = useRouter();
  const [showIntro, setShowIntro] = useState<boolean | null>(null);

  useEffect(() => {
    router.prefetch("/login");
    if (sessionStorage.getItem(INTRO_KEY) === "1") {
      router.replace("/login");
      return;
    }
    sessionStorage.setItem(INTRO_KEY, "1");
    queueMicrotask(() => setShowIntro(true));
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--bg-plan)] md:bg-[var(--bg-main)]">
      {showIntro ? <AppIntro onFinish={() => router.replace("/login")} /> : null}
    </div>
  );
}
