"use client";

import { useEffect, useState } from "react";
import { useOneClickTrading } from "@/lib/oneClickTrading";
import { notifyTradeInfo, TRADE_INFO_EVENT } from "@/lib/tradeToast";
import { useOrderSound } from "@/lib/orderSound";
import { useQuoteViewMode } from "@/lib/quoteViewMode";
import { useOrderSheetMode } from "@/lib/orderSheetMode";

/**
 * Trade-portal shortcuts (plain key or Ctrl+Alt):
 *  O — toggle one-click trading
 *  M — toggle order sound
 *  Q — toggle quotes view (simple/advanced)
 *  T — toggle new-order sheet mode (simple/advanced)
 */
export default function TradeShortcuts() {
  const [oneClick, setOneClick] = useOneClickTrading();
  const [sound, setSound] = useOrderSound();
  const [quoteView, setQuoteView] = useQuoteViewMode();
  const [orderMode, setOrderMode] = useOrderSheetMode();
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const onInfo = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail;
      if (!msg) return;
      setInfo(msg);
    };
    window.addEventListener(TRADE_INFO_EVENT, onInfo);
    return () => window.removeEventListener(TRADE_INFO_EVENT, onInfo);
  }, []);

  useEffect(() => {
    if (!info) return;
    const t = window.setTimeout(() => setInfo(null), 2600);
    return () => window.clearTimeout(t);
  }, [info]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
      const combo = e.ctrlKey && e.altKey && !e.metaKey;
      if (!plain && !combo) return;
      const key = e.key.toLowerCase();
      if (key === "o") {
        e.preventDefault();
        const next = !oneClick;
        setOneClick(next);
        notifyTradeInfo(next ? "One-click trading ON — orders place instantly" : "One-click trading OFF — confirmation required");
      } else if (key === "m") {
        e.preventDefault();
        const next = !sound;
        setSound(next);
        notifyTradeInfo(next ? "Order sound ON" : "Order sound OFF");
      } else if (key === "q") {
        e.preventDefault();
        const next = quoteView === "simple" ? "advanced" : "simple";
        setQuoteView(next);
        notifyTradeInfo(`Quotes view: ${next === "simple" ? "Simple" : "Advanced"}`);
      } else if (key === "t") {
        e.preventDefault();
        const next = orderMode === "simple" ? "advanced" : "simple";
        setOrderMode(next);
        notifyTradeInfo(`Order sheet: ${next === "simple" ? "Simple" : "Advanced"}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [oneClick, sound, quoteView, orderMode, setOneClick, setSound, setQuoteView, setOrderMode]);

  return info ? (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-[10001] -translate-x-1/2 rounded-none border border-[var(--primary)]/40 bg-[var(--bg-card)] px-4 py-2 text-[12px] font-semibold text-[var(--text-main)] shadow-xl">
      {info}
    </div>
  ) : null;
}
