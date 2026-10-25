"use client";

import { usePathname, useRouter, useParams } from "next/navigation";
import {
  ArrowUpDown,
  BarChart3,
  TrendingUp,
  History,
  Settings,
} from "lucide-react";

export default function TradeBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { accountId } = useParams<{ accountId: string }>();

  const base = `/trade`;

  const NAV_ITEMS = [
    { key: "quotes", label: "Quotes", icon: ArrowUpDown, path: `${base}/quotes` },
    { key: "charts", label: "Charts", icon: BarChart3, path: `${base}/charts` },
    { key: "trade", label: "Trade", icon: TrendingUp, path: `${base}/trade` },
    { key: "history", label: "History", icon: History, path: `${base}/history` },
    { key: "settings", label: "Settings", icon: Settings, path: `${base}/settings` },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 h-[64px] pb-[env(safe-area-inset-bottom)] flex items-center justify-around border-t border-[var(--border-soft)] bg-[var(--bg-plan)] md:hidden">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.path || pathname === base;

        const Icon = item.icon;

        return (
          <button
            key={item.key}
            onClick={() => router.push(item.path)}
            className="flex flex-col items-center gap-1 w-full"
          >
            {/* ICON WRAPPER */}
            <div
              className={`p-2 rounded-2xl transition-colors ${active ? "bg-[var(--primary)]/20" : "bg-transparent"
                }`}
            >
              <Icon
                size={20}
                className={
                  active
                    ? "text-[var(--primary)]"
                    : "text-[var(--text-muted)]"
                }
              />
            </div>

            {/* LABEL */}
            <span
              className={`text-[11px] ${active
                  ? "text-[var(--primary)] font-medium"
                  : "text-[var(--text-muted)]"
                }`}
            >
              {item.label}
            </span>
          </button>

        );
      })}
    </nav>
  );
}
