"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import GlobalLoader from "@/app/components/ui/GlobalLoader";

/** Legacy IB dashboard URL - the IB portal now lives under /ib. */
export default function ReferalRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ib");
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <GlobalLoader />
    </div>
  );
}
