"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientNetworkRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/ib/client-network/my-clients");
  }, [router]);
  return null;
}
