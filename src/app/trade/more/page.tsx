"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  WalletCards,
  Zap,
} from "lucide-react";
import { useTheme } from "@/app/providers";
import { useOneClickTrading } from "@/lib/oneClickTrading";
import TopBarSlot from "../components/layout/TopBarSlot";
import TradeTopBar from "../components/layout/TradeTopBar";
import ConfirmDialog from "../components/trade/mobile/ConfirmDialog";
import { useTradeAccount } from "@/hooks/accounts/useAccountById";
import { clearClientCookie, clearTradeTokenCookie } from "@/lib/tradeToken";
import { beginTradeExit } from "@/lib/tradeSession";

const TRADE_AUTH_STATE_KEY = "trade-auth-state";
const TRADE_AUTH_LOGGED_OUT = "trade-logged-out";

export default function TradeMorePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: tradeAccount } = useTradeAccount();
  const row = (tradeAccount ?? null) as Record<string, unknown> | null;
  const accountId = row ? String(row.accountId ?? row._id ?? row.id ?? "") : "";
  const accountQuery = accountId ? `?account=${encodeURIComponent(accountId)}` : "";
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [oneClick, setOneClick] = useOneClickTrading();
  const [quitOpen, setQuitOpen] = useState(false);
  const [quitting, setQuitting] = useState(false);

  const quit = async () => {
    setQuitting(true);
    beginTradeExit();
    try {
      const { clearTradeSessionPresence } = await import("@/lib/presence");
      await clearTradeSessionPresence();
    } catch {
      // Presence errors must not block leaving the trading portal.
    }
    queryClient.cancelQueries();
    queryClient.removeQueries({ queryKey: ["trade-account"] });
    queryClient.removeQueries({ queryKey: ["watchlist"] });
    clearTradeTokenCookie({ silent: true });
    clearClientCookie("accountId");
    clearClientCookie("sessionType");
    clearClientCookie("tradeSessionType");
    clearClientCookie("tradeAccount");
    localStorage.removeItem("tradeAccountId");
    localStorage.setItem(TRADE_AUTH_STATE_KEY, TRADE_AUTH_LOGGED_OUT);
    window.dispatchEvent(new Event("trade-account-change"));
    window.location.replace("/dashboard");
  };

  return (
    <>
      <TopBarSlot>
        <TradeTopBar title="More" />
      </TopBarSlot>

      <div className="min-h-full space-y-3 bg-[var(--bg-plan)] px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-3">
        <Group>
          <Item
            icon={<ArrowDownToLine size={18} />}
            label="Deposit"
            hint="Add funds to this trading account"
            onClick={() => router.push(`/dashboard/payments/deposit${accountQuery}`)}
          />
          <Item
            icon={<ArrowUpFromLine size={18} />}
            label="Withdraw"
            hint="Withdraw funds from this trading account"
            onClick={() => router.push(`/dashboard/payments/withdraw${accountQuery}`)}
          />
          <Item
            icon={<WalletCards size={18} />}
            label="Trading accounts"
            hint="Switch, deposit or open accounts"
            onClick={() => router.push("/trade/dashboard")}
          />
        </Group>

        <Group>
          <ToggleItem
            icon={isDark ? <Moon size={18} /> : <Sun size={18} />}
            label="Theme"
            hint={isDark ? "Dark mode" : "Light mode"}
            checked={isDark}
            onToggle={toggleTheme}
          />
          <ToggleItem
            icon={<Zap size={18} />}
            label="One-click trading"
            hint={oneClick ? "Orders are placed without confirmation" : "Confirm each order before placing"}
            checked={oneClick}
            onToggle={() => setOneClick(!oneClick)}
          />
        </Group>

        <Group>
          <Item
            icon={<LayoutDashboard size={18} />}
            label="Back to client portal"
            hint="Open your dashboard"
            onClick={() => router.push("/dashboard")}
          />
          <Item
            icon={<LogOut size={18} />}
            label="Quit trading portal"
            hint="End this trading session"
            danger
            onClick={() => setQuitOpen(true)}
          />
        </Group>
      </div>

      <ConfirmDialog
        open={quitOpen}
        description="Quit the trading portal? Your trading session will end and you will return to the dashboard."
        rows={[]}
        confirmLabel="Quit"
        confirmClass="bg-[#b91c1c]"
        sending={quitting}
        onCancel={() => setQuitOpen(false)}
        onConfirm={quit}
      />
    </>
  );
}

function Group({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)]">
      {children}
    </div>
  );
}

function ToggleItem({
  icon,
  label,
  hint,
  checked,
  onToggle,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={checked}
      className="flex w-full items-center gap-3 border-b border-[var(--border-soft)] px-4 py-3.5 text-left last:border-b-0 active:bg-[var(--bg-glass)]"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-[var(--text-main)]">{label}</span>
        <span className="block text-[12px] text-[var(--text-muted)]">{hint}</span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-[var(--primary)]" : "bg-[var(--border-strong)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function Item({
  icon,
  label,
  hint,
  danger,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-[var(--border-soft)] px-4 py-3.5 text-left last:border-b-0 active:bg-[var(--bg-glass)]"
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
          danger
            ? "bg-[var(--loss)]/10 text-[var(--loss)]"
            : "bg-[var(--primary-soft)] text-[var(--primary)]"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[14px] font-semibold ${danger ? "text-[var(--loss)]" : "text-[var(--text-main)]"}`}>
          {label}
        </span>
        <span className="block truncate text-[12px] text-[var(--text-muted)]">{hint}</span>
      </span>
      <ChevronRight size={17} className="shrink-0 text-[var(--text-muted)]" />
    </button>
  );
}
