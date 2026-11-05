"use client";

import Image from "next/image";
import { useLogout } from "@/hooks/useAuth";
import ThemeToggle from "@/app/components/ThemeToggle";
import {
  Menu,
  Bell,
  ChevronDown,
  Wallet,
  ArrowLeftRight,
  FileText,
  BadgeCheck,
  Settings,
  Layers,
  Gift,
  Headphones,
  LogOut,
  User,
  Repeat,
  LayoutDashboard,
  Network,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUserMe } from "@/hooks/useUser";
import { useNotifications } from "@/hooks/useNotifications";

function getPageTitle(pathname: string | null): string {
  const path = String(pathname || "");
  if (path === "/dashboard") return "Dashboard";
  if (path.startsWith("/dashboard/accounts/open")) return "Open Account";
  if (path.startsWith("/dashboard/accounts")) return "Accounts";
  if (path.startsWith("/dashboard/assets")) return "Assets";
  if (path.startsWith("/dashboard/payments/deposit")) return "Deposit";
  if (path.startsWith("/dashboard/payments/withdraw")) return "Withdrawal";
  if (path.startsWith("/dashboard/payments/internal-fund-transfer")) {
    return "Internal Transfer";
  }
  if (path.startsWith("/dashboard/payments/transactions")) return "Transactions";
  if (path.startsWith("/dashboard/payments")) return "Funds";
  if (path.startsWith("/dashboard/kyc")) return "KYC";
  if (path.startsWith("/dashboard/profile")) return "Profile";
  if (path.startsWith("/dashboard/change-password")) return "Change Password";
  if (path.startsWith("/dashboard/referal")) return "IB Dashboard";
  if (path.startsWith("/dashboard/support")) return "Ticket";
  if (path.startsWith("/dashboard/trading-platform")) return "Trading Platform";
  if (path.startsWith("/dashboard/notifications")) return "Notifications";
  return "Dashboard";
}

function getInitials(name?: string | null): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase() || "U";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase() || "U";
  }
  return "U";
}

export default function Topbar({
  onMenuClick,
}: {
  onMenuClick: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();
  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname]);

  /* ================= STATES ================= */
  const [userHover, setUserHover] = useState(false);
  const [userPinned, setUserPinned] = useState(false);

  const [notifHover, setNotifHover] = useState(false);
  const [notifPinned, setNotifPinned] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const { data: user } = useUserMe();

  const userOpen = userHover || userPinned;
  const notifOpen = notifHover || notifPinned;
  const { data: notifData } = useNotifications(1, 3);

  /* ================= OUTSIDE CLICK ================= */
  {
    (userPinned || notifPinned) && (
      <div
        className="fixed inset-0 z-20"
        onClick={() => {
          setUserHover(false);
          setUserPinned(false);
          setNotifHover(false);
          setNotifPinned(false);
        }}
      />
    )
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        userRef.current &&
        !userRef.current.contains(e.target as Node)
      ) {
        setUserHover(false);
        setUserPinned(false);
      }

      if (
        notifRef.current &&
        !notifRef.current.contains(e.target as Node)
      ) {
        setNotifHover(false);
        setNotifPinned(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ================= LOGOUT ================= */
  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");

    const { clearAccessSession } = await import("@/lib/presence");
    await clearAccessSession({ clearRefresh: true });

    setToast("Logged out");

    if (refreshToken) logout.mutate({ refreshToken });

    window.location.replace("/login");
  };
  const initials = getInitials(user?.name);
  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-3 py-2.5 md:px-4 bg-[var(--bg-card)] border-b border-[var(--border-glass)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={onMenuClick}
            className="md:hidden rounded-lg p-2 hover:bg-[var(--bg-glass)]"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <Image
            src="/oceanaprofx-icon.png"
            alt="Oceana Profx"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-lg bg-white object-contain ring-1 ring-black/5 md:hidden"
          />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-[var(--text-main)] md:text-base">
              {pageTitle}
            </h1>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 md:gap-2">
          {user?.ibDashboardAccess === true ? (
            <ClientIbSwitch
              active={pathname?.startsWith(IB_DASHBOARD_HREF) ? "ib" : "client"}
              onChange={(next) => router.push(next === "ib" ? IB_DASHBOARD_HREF : "/dashboard")}
            />
          ) : null}

          <ThemeToggle />

          {/* 🔔 NOTIFICATIONS */}
          <div
            ref={notifRef}
            className="relative"
            onMouseEnter={() => setNotifHover(true)}
            onMouseLeave={() => !notifPinned && setNotifHover(false)}
          >
            <button
              onClick={() => setNotifPinned((v) => !v)}
              className="relative rounded-xl p-2 hover:bg-[var(--bg-main)]"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--primary)]" />
            </button>

            {notifOpen && (
              <div className="absolute -right-24 md:right-0 top-7 w-80 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-glass)] shadow-xl p-4 z-30">

                <p className="text-sm font-semibold mb-3">Notifications</p>

                {notifData?.data?.length ? (
                  <>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {notifData.data.map((n, index) => (
                        <div
                          key={String(n._id || n.id || `notif-${index}`)}
                          className="p-3 rounded-xl bg-[var(--bg-glass)]"
                        >
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        setNotifHover(false);
                        setNotifPinned(false);
                        router.push("/dashboard/notifications");
                      }}
                      className="mt-4 w-full text-sm text-[var(--primary)] hover:underline"
                    >
                      View All
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">
                    No notifications
                  </p>
                )}
              </div>
            )}

          </div>

          {/* 👤 USER */}
          <div
            ref={userRef}
            className="relative"
            onMouseEnter={() => setUserHover(true)}
            onMouseLeave={() => !userPinned && setUserHover(false)}
          >
            <button
              onClick={() => setUserPinned((v) => !v)}
              className="flex max-w-[220px] items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-[var(--bg-glass)] md:max-w-[280px] md:px-2.5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-xs font-semibold text-[var(--primary)]">
                {initials}
              </div>
              <div className="hidden min-w-0 text-left sm:block">
                <p className="truncate text-[13px] font-semibold leading-tight text-[var(--text-main)]">
                  {user?.name || "Trader"}
                </p>
                <p className="truncate text-[11px] leading-tight text-[var(--text-muted)]">
                  {user?.email || ""}
                </p>
              </div>
              <ChevronDown size={14} className="shrink-0 text-[var(--text-muted)]" />
            </button>

            {userOpen && (
              <div className="absolute right-0 top-12 w-80 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-glass)] shadow-xl p-4 origin-top animate-dropdown z-30" onClick={(e) => e.stopPropagation()}>
                {/* INFO */}
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/15 text-sm font-semibold text-[var(--primary)]">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{user?.name}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {user?.email}
                    </p>
                    {(() => {
                      const badge = getKycBadge(user?.kycStatus);

                      return (
                        <span
                          className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-medium ${badge.wrapper}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                          {badge.text}
                        </span>
                      );
                    })()}

                  </div>
                </div>

                {/* ACTIONS */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Btn icon={Wallet} label="Deposit" page="payments/deposit" onClick={() => {
                    setUserHover(false);
                    setUserPinned(false);
                  }} />
                  <Btn icon={Repeat} label="Withdraw" page="payments/withdraw" onClick={() => {
                    setUserHover(false);
                    setUserPinned(false);
                  }}/>
                  <Btn icon={ArrowLeftRight} label="Transfer" page="payments/internal-fund-transfer"  onClick={() => {
                    setUserHover(false);
                    setUserPinned(false);
                  }} />
                  <Btn icon={FileText} label="Transactions" page="payments/transactions"  onClick={() => {
                    setUserHover(false);
                    setUserPinned(false);
                  }}/>
                </div>

                <Divider />

                <MenuItem
                  icon={BadgeCheck}
                  label="Verification / KYC"
                  page="kyc"
                  onClick={() => {
                    setUserHover(false);
                    setUserPinned(false);
                  }}
                />
                <MenuItem
                  icon={User}
                  label="Edit Profile"
                  page="profile"
                  onClick={() => {
                    setUserHover(false);
                    setUserPinned(false);
                  }}
                />
                <MenuItem
                  icon={Settings}
                  label="Change Password"
                  page="change-password"
                  onClick={() => {
                    setUserHover(false);
                    setUserPinned(false);
                  }}
                />
                {user?.ibDashboardAccess === true ? (
                  <MenuItem icon={Gift} label="Referral Link" page="referal" onClick={() => {
                    setUserHover(false);
                    setUserPinned(false);
                  }} />
                ) : null}
                <MenuItem icon={Headphones} label="Ticket" page="/support" onClick={() => {
                  setUserHover(false);
                  setUserPinned(false);
                }}/>

                <Divider />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-[var(--error)] hover:bg-[var(--bg-glass)]"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-[var(--primary)] text-[var(--text-main)] px-4 py-2 shadow-xl animate-fadeIn">
          {toast}
        </div>
      )}
    </>
  );
}

/* ===== HELPERS ===== */

const IB_DASHBOARD_HREF = "/dashboard/referal";
/** Slightly deeper than the brand primary for the active pill (client asked for a darker tone). */
const SWITCH_ACTIVE_BG = "color-mix(in srgb, var(--primary) 78%, #000)";

function ClientIbSwitch({
  active,
  onChange,
}: {
  active: "client" | "ib";
  onChange: (next: "client" | "ib") => void;
}) {
  const options = [
    { key: "client" as const, label: "Client", icon: LayoutDashboard },
    { key: "ib" as const, label: "IB", icon: Network },
  ];
  return (
    <div
      role="tablist"
      aria-label="Switch dashboard"
      className="relative grid grid-cols-2 rounded-full border border-[var(--primary)]/25 bg-[var(--primary)]/[0.08] p-1"
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full shadow-[0_4px_12px_-4px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out"
        style={{
          background: SWITCH_ACTIVE_BG,
          transform: active === "ib" ? "translateX(100%)" : "translateX(0)",
        }}
      />
      {options.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => !isActive && onChange(key)}
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors duration-300 md:px-4 ${
              isActive ? "text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-main)]"
            }`}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MenuItem({ icon: Icon, label, page, onClick }: any) {
  const router = useRouter();

  const handleClick = () => {
    onClick?.();
    if (page) router.push(`/dashboard/${page}`);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-[var(--bg-glass)] text-sm"
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function Btn({ icon: Icon, label, page, onClick }: any) {
  const router = useRouter();
  const handleClick = () => {
    onClick?.();
    if (page) router.push(`/dashboard/${page}`);
  };
  return (
    <button onClick={handleClick} className="flex items-center gap-2 justify-center rounded-xl border border-[var(--border-soft)] py-2 text-sm hover:bg-[var(--bg-glass)]">
      <Icon size={14} />
      {label}
    </button>
  );
}

function Divider() {
  return <div className="my-3 h-px bg-[var(--border-soft)]" />;
}
type KycStatus = "VERIFIED" | "REJECTED" | "PENDING" | "NOT_STARTED" | string;

function getKycBadge(status?: KycStatus) {
  switch (status?.toUpperCase()) {
    case "VERIFIED":
      return {
        text: "Verified",
        wrapper: "bg-emerald-500/10 text-emerald-500",
        dot: "bg-emerald-500",
      };

    case "REJECTED":
      return {
        text: "Rejected",
        wrapper: "bg-red-500/10 text-red-500",
        dot: "bg-red-500",
      };

    case "PENDING":
      return {
        text: "Pending",
        wrapper: "bg-yellow-500/10 text-yellow-500",
        dot: "bg-yellow-500",
      };

    case "NOT_STARTED":
    default:
      return {
        text: "KYC Not Verified",
        wrapper: "bg-gray-500/10 text-gray-400",
        dot: "bg-gray-400",
      };
  }
}
