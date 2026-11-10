"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TradeSidebarProvider } from "./components/layout/TradeSidebarContext";
import TradeBottomNav from "./components/layout/TradeBottomNav";
import { TradeDesktopProvider, useTradeDesktop } from "./components/desktop/TradeDesktopContext";
import TradeDesktopSidebar from "./components/desktop/TradeDesktopSidebar";
import TradeQuotesPanel from "./components/desktop/TradeQuotesPanel";
import { useTradeAccount } from "@/hooks/accounts/useAccountById";
import { LanguageProvider } from "./components/LanguageProvider";
import { getTradeTokenFromStorageSync } from "@/lib/tradeToken";
import GlobalLoader from "../components/ui/GlobalLoader";
import ConfirmDialog from "./components/trade/mobile/ConfirmDialog";
import TradeShortcuts from "./components/layout/TradeShortcuts";

export default function TradeLayoutClient({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <LanguageProvider>

            <TradeSidebarProvider>
                <TradeDesktopProvider>
                    <TradeLayoutInner>
                        {children}
                    </TradeLayoutInner>
                </TradeDesktopProvider>
            </TradeSidebarProvider>
        </LanguageProvider>
    );
}

function TradeLayoutInner({
    children,
}: {
    children: ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { quotesOpen } = useTradeDesktop();
    useTradeAccount();// keep trade account cache warm globally
    const [isDesktop, setIsDesktop] = useState<boolean>(false);
    const [viewportReady, setViewportReady] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const [hasTradeToken, setHasTradeToken] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const ignoreNextPopRef = useRef(false);

    useEffect(() => {
        const mq = window.matchMedia("(min-width: 768px)");
        const apply = () => {
            setIsDesktop(mq.matches);
            setViewportReady(true);
        };
        apply();
        mq.addEventListener("change", apply);
        return () => mq.removeEventListener("change", apply);
    }, []);

    // Desktop (≥768px) only has /trade/trading; the other trade pages are mobile-only.
    const isTradingRoute = pathname === "/trade/trading";
    const needsViewportRedirect =
        viewportReady && (isDesktop ? !isTradingRoute : isTradingRoute);

    useEffect(() => {
        if (!needsViewportRedirect) return;
        router.replace(isDesktop ? "/trade/trading" : "/trade/quotes");
    }, [needsViewportRedirect, isDesktop, router]);

    useEffect(() => {
        const syncAuth = () => {
            const token = getTradeTokenFromStorageSync();
            const isAuthed = Boolean(token);
            setHasTradeToken(isAuthed);
            setAuthChecked(true);
            if (!isAuthed) {
                router.replace("/trade-open");
                return;
            }
        };

        syncAuth();
        window.addEventListener("focus", syncAuth);
        window.addEventListener("trade-token-change", syncAuth);
        return () => {
            window.removeEventListener("focus", syncAuth);
            window.removeEventListener("trade-token-change", syncAuth);
        };
    }, [router]);

    useEffect(() => {
        if (typeof window === "undefined" || !hasTradeToken) return;

        const onPopState = () => {
            if (ignoreNextPopRef.current) {
                ignoreNextPopRef.current = false;
                return;
            }

            // Any back navigation inside the trade portal asks before leaving to the dashboard.
            ignoreNextPopRef.current = true;
            window.history.go(1);
            setShowExitConfirm(true);
        };

        // Native (Capacitor) back button and in-app "Quit" both route through here.
        const onExitRequest = () => setShowExitConfirm(true);

        window.addEventListener("popstate", onPopState);
        window.addEventListener("trade-exit-request", onExitRequest);
        return () => {
            window.removeEventListener("popstate", onPopState);
            window.removeEventListener("trade-exit-request", onExitRequest);
        };
    }, [hasTradeToken]);

    const stayInTradePanel = () => {
        setShowExitConfirm(false);
    };

    const closeTradePanel = () => {
        setShowExitConfirm(false);
        router.replace("/dashboard");
    };

    useEffect(() => {
        if (typeof window === "undefined") return;

        const refreshAfterResume = () => {
            if (document.visibilityState === "hidden") return;

            const scrollers = document.querySelectorAll<HTMLElement>(".ios-momentum-scroll");
            scrollers.forEach((el) => {
                const top = el.scrollTop;
                el.style.setProperty("-webkit-overflow-scrolling", "auto");
                // Force reflow to fix iOS frozen scroll containers after app resume.
                void el.offsetHeight;
                el.style.setProperty("-webkit-overflow-scrolling", "touch");
                el.scrollTop = top;
            });

            window.requestAnimationFrame(() => {
                window.dispatchEvent(new Event("resize"));
            });
        };

        window.addEventListener("pageshow", refreshAfterResume);
        window.addEventListener("focus", refreshAfterResume);
        document.addEventListener("visibilitychange", refreshAfterResume);

        return () => {
            window.removeEventListener("pageshow", refreshAfterResume);
            window.removeEventListener("focus", refreshAfterResume);
            document.removeEventListener("visibilitychange", refreshAfterResume);
        };
    }, []);

    useEffect(() => {
        if (typeof document === "undefined") return;

        const html = document.documentElement;
        const body = document.body;
        const prevHtmlOverflow = html.style.overflow;
        const prevBodyOverflow = body.style.overflow;

        // Keep a single scroll container inside trade layout to avoid double scrollbars.
        html.style.overflow = "hidden";
        body.style.overflow = "hidden";

        return () => {
            html.style.overflow = prevHtmlOverflow;
            body.style.overflow = prevBodyOverflow;
        };
    }, []);

    if (
        !authChecked ||
        !hasTradeToken ||
        !viewportReady ||
        needsViewportRedirect
    ) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[var(--bg-plan)]">
                <GlobalLoader />
            </div>
        );
    }

    return (
        <div className="trade-scrollbars min-h-screen mt-font mt-numbers bg-[var(--bg-plan)] md:bg-[var(--bg-card)]">
            <TradeShortcuts />
            {!isDesktop ? (
                <div className="flex h-[100dvh] min-h-0 flex-col pt-[env(safe-area-inset-top)]">
                    <div id="trade-topbar-slot" className="relative z-[666] h-14 shrink-0" />

                    <main
                        data-trade-main-scroll
                        className="min-h-0 flex-1 overflow-y-auto ios-momentum-scroll hide-scrollbar pb-[64px]"
                    >
                        {children}
                    </main>

                    <TradeBottomNav />
                </div>
            ) : isTradingRoute ? (
                <main className="h-screen min-h-0 w-full overflow-hidden bg-[var(--bg-plan)]">
                    {children}
                </main>
            ) : (
                <div className="flex h-screen min-h-0 w-full overflow-hidden bg-[var(--bg-plan)]">
                    <div className="w-[68px] shrink-0 border-r border-[var(--border-soft)]">
                        <TradeDesktopSidebar />
                    </div>

                    <div
                        className={`
                          transition-all duration-300 ease-in-out
                          ${quotesOpen ? "w-[340px]" : "w-0"}
                          shrink-0 overflow-hidden
                          ${quotesOpen ? "border-r border-[var(--border-soft)]" : ""}
                        `}
                    >
                        {quotesOpen && <TradeQuotesPanel />}
                    </div>

                    <main
                        data-trade-main-scroll
                        className="min-h-0 flex-1 min-w-0 overflow-y-auto ios-momentum-scroll bg-[var(--bg-card)]"
                    >
                        {children}
                    </main>
                </div>
            )}

            <ConfirmDialog
                open={showExitConfirm}
                description="Leave the trading portal and go back to your dashboard?"
                rows={[]}
                confirmLabel="Go to dashboard"
                confirmClass="bg-[var(--primary)]"
                onCancel={stayInTradePanel}
                onConfirm={closeTradePanel}
            />

        </div>
    );
}
