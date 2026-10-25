"use client";

import { createContext, useContext, useState } from "react";

type DesktopContextType = {
  quotesOpen: boolean;
  toggleQuotes: () => void;
  closeQuotes: () => void;
};

const DesktopContext = createContext<DesktopContextType | null>(null);

export function TradeDesktopProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [quotesOpen, setQuotesOpen] = useState(true);

  return (
    <DesktopContext.Provider
      value={{
        quotesOpen,
        toggleQuotes: () => setQuotesOpen((v) => !v),
        closeQuotes: () => setQuotesOpen(false),
      }}
    >
      {children}
    </DesktopContext.Provider>
  );
}

export function useTradeDesktop() {
  const ctx = useContext(DesktopContext);
  if (!ctx) throw new Error("useTradeDesktop must be used inside provider");
  return ctx;
}
