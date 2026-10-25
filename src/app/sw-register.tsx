// sw-register.tsx (client)
"use client";
import { useEffect } from "react";

export default function SWRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isCapacitor = !!(window as any).Capacitor || process.env.NEXT_PUBLIC_CAPACITOR === "true";
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    if ("serviceWorker" in navigator && !isCapacitor && !isLocalhost) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("SW registered"))
        .catch((e) => console.warn("SW register failed", e));
    } else {
      // ensure any leftover SW is removed during dev/testing
      navigator.serviceWorker?.getRegistrations?.().then((regs) => {
        regs?.forEach((r) => r.unregister());
      }).catch(()=>{});
    }
  }, []);
  return null;
}
