"use client";

import React from "react";
import { Minus } from "lucide-react";
import type { QuoteLiveState } from "@/types/market";
import { decimalDiff, formatPriceText, splitPrice } from "./QuoteRow";

export const PRICE_COL_CLASS = "w-[94px] max-[360px]:w-[82px]";

function dirColor(dir: QuoteLiveState["bidDir"]) {
  if (dir === "up") return "text-[var(--profit)]";
  if (dir === "down") return "text-[var(--loss)]";
  return "text-[var(--text-main)]";
}

function Price({ text, className }: { text: string; className: string }) {
  const p = splitPrice(text);
  return (
    <div
      className={`whitespace-nowrap font-mono text-[14px] font-semibold leading-none tabular-nums ${className}`}
    >
      {p.int}
      {p.big || p.normal ? "." : ""}
      {p.normal}
      <span className="text-[19px]">{p.big}</span>
      {p.small ? (
        <sup className="relative top-[-8px] text-[11px]">{p.small}</sup>
      ) : null}
    </div>
  );
}

function FavouriteQuoteRow({
  live,
  categoryLabel,
  avatarColor,
  editing,
  viewMode = "advanced",
  onRemove,
}: {
  live: QuoteLiveState;
  categoryLabel: string;
  avatarColor: string;
  editing: boolean;
  viewMode?: "advanced" | "simple";
  onRemove: () => void;
}) {
  const bidText = formatPriceText(live.bid, live.symbol);
  const askText = formatPriceText(live.ask, live.symbol);
  const lowText = live.low === undefined ? "--" : formatPriceText(live.low, live.symbol);
  const highText = live.high === undefined ? "--" : formatPriceText(live.high, live.symbol);
  const spread = decimalDiff(bidText, askText);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5 border-b border-[var(--border-soft)] px-3 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white"
          style={{ background: avatarColor }}
        >
          {live.symbol.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 leading-tight">
          <p className="break-all text-[15px] font-semibold text-[var(--text-main)]">
            {live.symbol}
          </p>
          <p className="truncate text-[13px] text-[var(--text-muted)]">
            {categoryLabel}
            {viewMode === "advanced" && spread !== "---" ? ` · ${spread}` : ""}
          </p>
        </div>
      </div>

      {editing ? (
        <>
          <span className={PRICE_COL_CLASS} />
          <div className={`flex justify-end ${PRICE_COL_CLASS}`}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              aria-label={`Remove ${live.symbol}`}
              className="grid h-8 w-8 place-items-center rounded-full bg-[var(--withdraw-bg)] text-[var(--loss)]"
            >
              <Minus size={16} />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={`text-right ${PRICE_COL_CLASS}`}>
            <Price text={bidText} className={dirColor(live.bidDir)} />
            {viewMode === "advanced" ? (
              <p className="mt-1 font-mono text-[12px] text-[var(--text-muted)]">L {lowText}</p>
            ) : null}
          </div>
          <div className={`text-right ${PRICE_COL_CLASS}`}>
            <Price text={askText} className={dirColor(live.askDir)} />
            {viewMode === "advanced" ? (
              <p className="mt-1 font-mono text-[12px] text-[var(--text-muted)]">H {highText}</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

export default React.memo(FavouriteQuoteRow);
