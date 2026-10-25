"use client";

import { createContext, useContext, useState } from "react";

type SidebarContextType = {
  open: () => void;
  close: () => void;
  isOpen: boolean;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function TradeSidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useTradeSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useTradeSidebar must be used inside provider");
  return ctx;
}
