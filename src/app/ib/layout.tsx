"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import IbSidebar from "./components/IbSidebar";
import Topbar from "@/app/dashboard/components/topbar";
import { useUserMe } from "@/hooks/useUser";
import GlobalLoader from "@/app/components/ui/GlobalLoader";

export default function IbLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: me, isLoading, isFetching, isError, refetch } = useUserMe({ staleTime: 0 });
  const allowed = me?.ibDashboardAccess === true;
  // Redirect only on a definitive answer: user data loaded and access is false.
  // A transient API error must not kick the user back to the client dashboard.
  const blocked = !!me && me.ibDashboardAccess !== true;

  useEffect(() => {
    if (blocked) router.replace("/dashboard");
  }, [blocked, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--bg-main)]">
        <GlobalLoader />
        {isError && !isFetching ? (
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-[var(--bg-main)] pt-[env(safe-area-inset-top)]">
      <IbSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto ios-momentum-scroll p-2 md:p-3">
          {children}
        </main>
      </div>
    </div>
  );
}
