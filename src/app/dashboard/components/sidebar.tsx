"use client";

import { useUserMe } from "@/hooks/useUser";
import {
  ArrowLeftRight,
  Layers,
  Gift,
  Headphones,
  Landmark,
  ChevronLeft,
  ChevronDown,
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  LayoutDashboard,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { ComponentType } from "react";

const items = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Accounts", icon: Landmark, href: "/dashboard/accounts" },
];

const paymentItems = [
  { label: "Deposit", href: "/dashboard/payments/deposit", icon: ArrowDownCircle },
  { label: "Withdrawal", href: "/dashboard/payments/withdraw", icon: ArrowUpCircle },
  { label: "Internal Transfer", href: "/dashboard/payments/internal-fund-transfer", icon: ArrowLeftRight },
  { label: "Transactions", href: "/dashboard/payments/transactions", icon: Receipt },
];

const bottomItems = [
  {
    label: "Trading Platform",
    icon: Layers,
    href: "/dashboard/trading-platform",
  },
  { label: "IB Dashboard", icon: Gift, href: "/dashboard/referal" },
  { label: "Ticket", icon: Headphones, href: "/dashboard/support" },
];

export default function Sidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapse,
}: {
  open: boolean;
  collapsed: boolean;
  onClose?: () => void;
  onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { data: user } = useUserMe();
  const [paymentOpen, setPaymentOpen] = useState(false);

  const isPaymentActive = pathname.startsWith("/dashboard/payments");
  const userInitial = String(user?.name || "T").trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (isPaymentActive) setPaymentOpen(true);
  }, [isPaymentActive]);

  useEffect(() => {
    const routes = new Set<string>([
      ...items.map((item) => item.href),
      ...paymentItems.map((item) => item.href),
      ...bottomItems.map((item) => item.href),
      "/trade-login",
    ]);
    routes.forEach((route) => {
      router.prefetch(route);
    });
  }, [router]);

  const navigateTo = useCallback(
    (href: string) => {
      onClose?.();
      if (pathname === href || isPending) return;
      startTransition(() => {
        router.push(href);
      });
    },
    [isPending, onClose, pathname, router]
  );

  const NavButton = ({
    label,
    icon: Icon,
    href,
    active,
    onClick,
  }: {
    label: string;
    icon: ComponentType<{ size?: number; className?: string }>;
    href: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <div className="relative group">
      <button
        onClick={onClick}
        onMouseEnter={() => router.prefetch(href)}
        onFocus={() => router.prefetch(href)}
        onTouchStart={() => router.prefetch(href)}
        className={`
          flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 transition-all duration-200
          ${active
            ? "bg-[var(--bg-glass)] text-[var(--primary)] shadow-[inset_3px_0_0_var(--primary)]"
            : "text-[var(--text-muted)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
          }
        `}
      >
        <span className="h-8 w-8 flex items-center justify-center rounded-lg bg-[var(--bg-glass)] border border-[var(--border-soft)]">
          <Icon size={16} />
        </span>

        {!collapsed && <span className="text-[13px] font-medium truncate">{label}</span>}
      </button>

      {/* TOOLTIP */}
      {collapsed && (
        <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 rounded-md border border-[var(--border-soft)] bg-[var(--bg-card)] px-2 py-1 text-xs text-[var(--text-main)] opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-[130] shadow-lg">
          {label}
        </span>
      )}
    </div>
  );

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <aside
        className={`
    fixed md:relative z-[120] h-screen transition-all duration-300 flex flex-col overflow-x-visible
    ${collapsed ? "w-16" : "w-56"}
    bg-[var(--bg-card)]/95 backdrop-blur-md
    border-r border-[var(--border-glass)]
    ${open ? "left-0" : "-left-full md:left-0"}
  `}
      >

        <div className="flex items-center justify-between px-3 py-3 border-b border-[var(--border-soft)] relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/15 via-[var(--primary)]/5 to-transparent pointer-events-none" />

          {!collapsed && (
            <div className="relative z-10 min-w-0">
              <p className="text-[13px] uppercase tracking-wider text-[var(--text-main)] font-bold truncate max-w-[140px]">
                {user?.name || "Trader"}
              </p>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] tracking-wide">Dashboard</p>
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className="relative z-10 rounded-lg p-2 border border-[var(--border-soft)] bg-[var(--bg-glass)] hover:bg-[var(--primary)]/10 transition"
          >
            <ChevronLeft
              size={18}
              className={`transition duration-300 ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        <nav
          className={`mt-4 px-2 space-y-1 flex-1 ${
            collapsed ? "overflow-visible" : "overflow-y-auto"
          }`}
        >
          {items.map((item) => (
            <NavButton
              key={item.label}
              {...item}
              active={
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href)
              }
              onClick={() => {
                navigateTo(item.href);
              }}
            />
          ))}

          {/* FUNDS — accordion inside sidebar */}
          <div
            className="relative group"
            onMouseEnter={() => collapsed && setPaymentOpen(true)}
            onMouseLeave={() => collapsed && setPaymentOpen(false)}
          >
            <button
              type="button"
              onClick={() => !collapsed && setPaymentOpen((v) => !v)}
              className={`
                flex w-full items-center justify-between rounded-lg px-2.5 py-2 transition-all duration-200
                ${isPaymentActive
                  ? "bg-[var(--bg-glass)] text-[var(--primary)] shadow-[inset_3px_0_0_var(--primary)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
                }
              `}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-soft)] bg-[var(--bg-glass)]">
                  <CreditCard size={16} />
                </span>
                {!collapsed && (
                  <span className="truncate text-[13px] font-medium">Funds</span>
                )}
              </div>

              {!collapsed && (
                <ChevronDown
                  size={16}
                  className={`shrink-0 transition-transform duration-300 ease-out ${
                    paymentOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              )}
            </button>

            {collapsed && (
              <span className="pointer-events-none absolute left-full top-1/2 z-[130] ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-[var(--border-soft)] bg-[var(--bg-card)] px-2 py-1 text-xs text-[var(--text-main)] opacity-0 shadow-lg transition group-hover:opacity-100">
                Funds
              </span>
            )}

            {/* Expanded sidebar: smooth slide-down accordion */}
            {!collapsed && (
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  paymentOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-[var(--border-soft)] pl-2 pb-1">
                    {paymentItems.map((sub) => {
                      const Icon = sub.icon;
                      const active = pathname === sub.href;
                      return (
                        <button
                          key={sub.label}
                          type="button"
                          onMouseEnter={() => router.prefetch(sub.href)}
                          onFocus={() => router.prefetch(sub.href)}
                          onTouchStart={() => router.prefetch(sub.href)}
                          onClick={() => navigateTo(sub.href)}
                          className={`
                            flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors duration-200
                            ${active
                              ? "bg-[var(--bg-glass)] text-[var(--primary)]"
                              : "text-[var(--text-muted)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
                            }
                          `}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                              active
                                ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                                : "bg-[var(--bg-glass)]"
                            }`}
                          >
                            <Icon size={14} />
                          </span>
                          <span className="truncate text-[12px] font-medium">
                            {sub.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Collapsed: flyout aligned to sidebar style */}
            {collapsed && paymentOpen && (
              <div className="absolute left-full top-0 z-[140] ml-2 w-48 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] py-1 shadow-md">
                {paymentItems.map((sub) => {
                  const Icon = sub.icon;
                  const active = pathname === sub.href;
                  return (
                    <button
                      key={sub.label}
                      type="button"
                      onMouseEnter={() => router.prefetch(sub.href)}
                      onClick={() => {
                        setPaymentOpen(false);
                        navigateTo(sub.href);
                      }}
                      className={`
                        flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors
                        ${active
                          ? "bg-[var(--bg-glass)] text-[var(--primary)]"
                          : "text-[var(--text-muted)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
                        }
                      `}
                    >
                      <Icon size={14} />
                      <span className="text-[12px] font-medium">{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {bottomItems.map((item) => (
            <NavButton
              key={item.label}
              {...item}
              active={pathname.startsWith(item.href)}
              onClick={() => {
                navigateTo(item.href);
              }}
            />
          ))}
        </nav>

        <div className="mx-2 mb-2 mt-2 border border-[var(--border-soft)] bg-[var(--bg-glass)] rounded-xl px-3 py-2.5">
          {collapsed ? (
            <div className="h-9 w-9 rounded-full bg-[var(--primary)]/15 border border-[var(--border-soft)] text-[var(--primary)] font-bold flex items-center justify-center">
              {userInitial}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[var(--primary)]/15 border border-[var(--border-soft)] text-[var(--primary)] font-bold flex items-center justify-center">
                {userInitial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-main)] truncate">
                  {user?.name || "Trader"}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {user?.email || "Broker Portal"}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
