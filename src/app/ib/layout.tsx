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
  const { data: me, isLoading, isFetching, isError } = useUserMe({ staleTime: 0 });
  const allowed = me?.ibDashboardAccess === true;
  const blocked = !isLoading && !isFetching && (isError || !allowed);

  useEffect(() => {
    if (blocked) router.replace("/dashboard");
  }, [blocked, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)]">
        <GlobalLoader />
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
