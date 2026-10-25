"use client";

import { useEffect, useRef } from "react";
import { useAuthGuard } from "@/hooks/useUser";
import { clearAccessSession } from "@/lib/presence";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, isError } = useAuthGuard();
  const clearingRef = useRef(false);

  useEffect(() => {
    if (!isError || clearingRef.current) return;
    clearingRef.current = true;
    void clearAccessSession({ clearRefresh: true }).finally(() => {
      window.location.replace("/login");
    });
  }, [isError]);

  if (isLoading) return null;
  if (isError) return null;

  return <>{children}</>;
}
