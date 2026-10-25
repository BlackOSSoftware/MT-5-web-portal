"use client";

import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTradeAccount } from "@/hooks/accounts/useAccountById";
import GlobalLoader from "../components/ui/GlobalLoader";

// Assuming you have icons from a library like Heroicons or Lucide
import { 
  Wallet, 
  TrendingUp, 
  Lock, 
  Settings, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  BarChart3 
} from "lucide-react";

export default function TradeDashboard() {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { data: account, isLoading } = useTradeAccount();

  useEffect(() => {
    if (isMobile) {
      router.replace(`/trade/quotes`);
    }
    else{
      router.replace('/trade/trade')
    }
  }, [isMobile, router]);

  if (isLoading || !account) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-main)' }}
      >
        <GlobalLoader />
      </div>
    );
  }

  return (
    <>
    
    </>
  );
}

/* =========================
   Reusable Parameter Block
========================== */
function Parameter({
  label,
  value,
  suffix,
  highlight,
  warning,
  icon,
}: {
  label: string;
  value: string;
  suffix?: string;
  highlight?: boolean;
  warning?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon && (
          <div 
            style={{
              color: highlight ? 'var(--success)' : warning ? 'var(--warning)' : 'var(--text-muted)'
            }}
          >
            {icon}
          </div>
        )}
        <div 
          className="text-xs uppercase tracking-wider font-semibold"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </div>
      </div>

      <div
        className="text-xl font-semibold"
        style={{
          color: highlight ? 'var(--success)' : warning ? 'var(--warning)' : 'var(--text-main)'
        }}
      >
        {value}
      </div>

      {suffix && (
        <div 
          className="text-xs font-medium"
          style={{ color: 'var(--text-muted)' }}
        >
          {suffix}
        </div>
      )}
    </div>
  );
}