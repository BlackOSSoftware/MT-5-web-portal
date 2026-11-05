"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./components/sidebar";
import Topbar from "./components/topbar";
import { listenForegroundMessages } from "@/lib/foregroundMessage";
import { useUserMe } from "@/hooks/useUser";
import GlobalLoader from "../components/ui/GlobalLoader";
import { Capacitor } from "@capacitor/core";
import KycReminderModal from "./components/KycReminderModal";
import { clearTradeExit } from "@/lib/tradeSession";

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const maybe = error as { response?: { status?: number } };
  return maybe.response?.status;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);


  const isTradePage = pathname?.startsWith("/dashboard/trade") ?? false;

  const hasToken = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(localStorage.getItem("accessToken"));
  }, []);

  // Reached the dashboard after "Exit panel"; opening trading again must work normally.
  useEffect(() => {
    clearTradeExit();
  }, []);

  useEffect(() => {
    if (!isTradePage && !hasToken) {
      router.replace("/login");
    }
  }, [hasToken, isTradePage, router]);

  const { data: user, isLoading, isError, error } = useUserMe({
    enabled: hasToken && !isTradePage,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    // âŒ Skip all web notification logic inside Android/iOS app
    if (Capacitor.isNativePlatform()) return;

    if ("Notification" in window) {
      listenForegroundMessages();

      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => { });
      }
    }
  }, []);

  useEffect(() => {
    if (isTradePage) return;
    if (!isError) return;

    const status = getErrorStatus(error);
    if (status === 401) {
      void import("@/lib/presence").then(({ clearAccessSession }) =>
        clearAccessSession({ clearRefresh: true }).finally(() => {
          router.replace("/login");
        })
      );
    }
  }, [error, isError, isTradePage, router]);


  /* ================= AUTH ================= */
    if (!isTradePage) {
    if (!hasToken) {
      return (
        <div className="flex h-screen items-center justify-center text-sm">
          <GlobalLoader />
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center text-sm">
          <GlobalLoader />
        </div>
      );
    }

    if (isError) return null;
  }


  /* ================= LAYOUT ================= */
  return (
    <>
    <KycReminderModal kycStatus={user?.kycStatus} />
    <div
      className={`relative h-[100dvh] overflow-hidden text-[var(--text-main)] ${isTradePage ? "bg-[var(--bg-plan)]" : "bg-[var(--bg-main)]"
        }`}
    >
      <div className="flex h-full">
        {/* SIDEBAR â€” FIXED HEIGHT */}
        <div
          className={`${isTradePage ? "hidden" : "block"} h-full`}
        >
          <Sidebar
            open={sidebarOpen}
            collapsed={collapsed}
            onClose={() => setSidebarOpen(false)}
            onToggleCollapse={() => setCollapsed((v) => !v)}
          />
        </div>

        {/* MAIN COLUMN */}
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          {/* TOPBAR */}
          <div className={isTradePage ? "hidden" : "block"}>
            <Topbar onMenuClick={() => setSidebarOpen(true)} />
          </div>

          {/* CONTENT â€” ONLY THIS SCROLLS */}
          <main
            className={`min-w-0 flex-1 overflow-x-hidden overflow-y-auto ios-momentum-scroll ${isTradePage ? "p-0" : "p-2 md:p-3"
              }`}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
    </>
  );

}

