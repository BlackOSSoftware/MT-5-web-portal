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
  Settings,
} from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";

const IB_DASHBOARD_HREF = "/dashboard/referal";

/* Sidebar surface + accents come from --sb-* tokens (navy in light theme, charcoal/violet in dark). */
const ITEM_BASE =
  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all duration-200";
const ITEM_ACTIVE =
  "[background:var(--sb-active-bg)] text-white shadow-[inset_3px_0_0_var(--sb-active-bar)]";
const ITEM_IDLE = "text-white/65 hover:bg-white/[0.06] hover:text-white";
const ICON_ACTIVE =
  "[background:var(--sb-icon-grad)] text-white [box-shadow:var(--sb-icon-glow)] border-transparent";
const ICON_IDLE = "bg-white/[0.05] border-white/10 text-white/75 group-hover/item:text-white";
const AVATAR = "[background:var(--sb-icon-grad)] text-white";
const FLYOUT =
  "rounded-xl border border-white/10 bg-[var(--sb-flyout)] text-white shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)]";

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
  { label: "IB Dashboard", icon: Gift, href: IB_DASHBOARD_HREF },
  { label: "Ticket", icon: Headphones, href: "/dashboard/support" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

function SectionLabel({ collapsed, children }: { collapsed: boolean; children: ReactNode }) {
  if (collapsed) return <div className="mx-auto my-2 h-px w-6 bg-white/10" aria-hidden />;
  return (
    <p className="px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
      {children}
    </p>
  );
}

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
  const { data: user } = useUserMe();
  const [paymentOpen, setPaymentOpen] = useState(false);

  const isPaymentActive = pathname.startsWith("/dashboard/payments");
  const visibleBottomItems = bottomItems.filter(
    (item) => item.href !== IB_DASHBOARD_HREF || user?.ibDashboardAccess === true,
  );
  const userInitial = String(user?.name || "T").trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (isPaymentActive) setPaymentOpen(true);
  }, [isPaymentActive]);

  useEffect(() => {
    const routes = new Set<string>([
      ...items.map((item) => item.href),
      ...paymentItems.map((item) => item.href),
      ...bottomItems.map((item) => item.href),
      "/trade-open",
    ]);
    routes.forEach((route) => {
      router.prefetch(route);
    });
  }, [router]);

  // Never drop a click while a previous navigation is still loading — the latest click wins.
  const navigateTo = useCallback(
    (href: string) => {
      onClose?.();
      if (pathname === href) return;
      router.push(href);
    },
    [onClose, pathname, router]
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
        className={`group/item ${ITEM_BASE} ${active ? ITEM_ACTIVE : ITEM_IDLE} ${collapsed ? "justify-center" : ""}`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
            active ? ICON_ACTIVE : ICON_IDLE
          }`}
        >
          <Icon size={16} />
        </span>

        {!collapsed && <span className="truncate text-[13px] font-medium">{label}</span>}
      </button>

      {/* TOOLTIP */}
      {collapsed && (
        <span
          className={`pointer-events-none absolute left-full top-1/2 z-[130] ml-3 -translate-y-1/2 whitespace-nowrap px-2.5 py-1 text-xs font-medium opacity-0 transition group-hover:opacity-100 ${FLYOUT}`}
        >
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
    ${collapsed ? "w-16" : "w-60"}
    border-r border-[var(--sb-border)] text-white [background:var(--sb-bg)] [box-shadow:var(--sb-shadow)]
    ${open ? "left-0" : "-left-full md:left-0"}
  `}
      >

        <div
          className={`relative flex border-b border-white/[0.07] px-3 py-3.5 ${
            collapsed ? "flex-col items-center gap-2" : "items-center justify-between gap-2"
          }`}
        >

          <button
            type="button"
            onClick={() => navigateTo("/dashboard")}
            aria-label="Oceana Profx dashboard"
            className="relative z-10 min-w-0 shrink"
          >
            {collapsed ? (
              <Image
                src="/oceanaprofx-icon.png"
                alt="Oceana Profx"
                width={36}
                height={36}
                className="h-9 w-9 rounded-lg bg-white object-contain shadow-sm ring-1 ring-black/5"
                priority
              />
            ) : (
              <span className="flex h-10 items-center rounded-lg bg-white px-2 shadow-sm ring-1 ring-black/5">
                <Image
                  src="/oceanaprofx-logo.png"
                  alt="Oceana Profx"
                  width={2172}
                  height={724}
                  className="h-7 w-auto max-w-[132px] object-contain"
                  priority
                />
              </span>
            )}
          </button>

          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="relative z-10 rounded-lg border border-white/10 bg-white/[0.05] p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft
              size={18}
              className={`transition duration-300 ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        <nav
          className={`mt-3 flex-1 space-y-1 px-2 ${
            collapsed ? "overflow-visible" : "overflow-y-auto"
          }`}
        >
          <SectionLabel collapsed={collapsed}>Overview</SectionLabel>
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
              className={`group/item ${ITEM_BASE} ${collapsed ? "justify-center" : "justify-between"} ${
                isPaymentActive ? ITEM_ACTIVE : ITEM_IDLE
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                    isPaymentActive ? ICON_ACTIVE : ICON_IDLE
                  }`}
                >
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
              <span
                className={`pointer-events-none absolute left-full top-1/2 z-[130] ml-3 -translate-y-1/2 whitespace-nowrap px-2.5 py-1 text-xs font-medium opacity-0 transition group-hover:opacity-100 ${FLYOUT}`}
              >
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
                  <div className="ml-[22px] mt-1 space-y-0.5 border-l border-white/10 pb-1 pl-2.5">
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
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors duration-200 ${
                            active ? "bg-white/[0.08] text-white" : "text-white/60 hover:bg-white/[0.05] hover:text-white"
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                              active ? "bg-[var(--sb-sub-active)] text-[var(--sb-sub-active-text)]" : "bg-white/[0.04]"
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
              <div className={`absolute left-full top-0 z-[140] ml-2 w-48 overflow-hidden py-1 ${FLYOUT}`}>
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
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                        active ? "bg-white/[0.08] text-white" : "text-white/65 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <Icon size={14} />
                      <span className="text-[12px] font-medium">{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <SectionLabel collapsed={collapsed}>Trading &amp; support</SectionLabel>
          {visibleBottomItems.map((item) => (
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

        <div
          className={`mx-2 mb-3 mt-2 rounded-2xl border border-white/10 bg-white/[0.04] ${
            collapsed ? "flex justify-center p-2" : "px-3 py-2.5"
          }`}
        >
          {collapsed ? (
            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${AVATAR}`}>
              {userInitial}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold [box-shadow:var(--sb-icon-glow)] ${AVATAR}`}
              >
                {userInitial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user?.name || "Trader"}</p>
                <p className="truncate text-xs text-white/50">{user?.email || "Broker Portal"}</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
