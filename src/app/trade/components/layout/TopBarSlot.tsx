"use client";

import { ReactNode, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function TopBarSlot({
  children,
}: {
  children: ReactNode;
}) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = document.getElementById("trade-topbar-slot");
    setSlot(el);
  }, []);

  if (!slot) return null;

  return createPortal(children, slot);
}
