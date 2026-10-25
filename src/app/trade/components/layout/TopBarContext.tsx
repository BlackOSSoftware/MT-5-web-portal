"use client";

import { createContext, useContext } from "react";

type SetTopBar = (node: React.ReactNode) => void;

export const TopBarContext = createContext<SetTopBar | null>(null);

export function useTopBar(node: React.ReactNode) {
  const setTopBar = useContext(TopBarContext);
  if (!setTopBar) {
    throw new Error("useTopBar must be used inside TradeLayout");
  }

  setTopBar(node);
}
