import api from "@/api/axios";

export interface TradeLoginPayload {
  account_number: string;
  password: string;
}

export interface TradeLoginResponse {
  tradeToken: string;
  sessionType: "TRADE" | "WATCH";
  account_number: string;
  account_type: string;
  accountId: string; 
}


/* ================= LOGIN ================= */
export const tradeLogin = async (
  payload: TradeLoginPayload
): Promise<TradeLoginResponse> => {
  const res = await api.post("/account-auth/login", payload);
  return res.data;
};
/* ================= ACTIVATE OWNED ACCOUNT (portal login → trade) ================= */
export const activateOwnedTradeAccount = async (
  accountId: string
): Promise<TradeLoginResponse> => {
  const res = await api.post("/account-auth/activate", { accountId });
  return (res.data?.data ?? res.data) as TradeLoginResponse;
};

/** Portal login → TRADE session on the user's primary (or first live) account. */
export const activatePrimaryTradeAccount = async (): Promise<TradeLoginResponse> => {
  const res = await api.post("/account-auth/activate-primary", {});
  return (res.data?.data ?? res.data) as TradeLoginResponse;
};

/* ================= RESET TRADE PASSWORD ================= */
export const resetTradePassword = async (
  accountId: string,
  newPassword: string
) => {
  const res = await api.post(
    `/account-auth/${accountId}/reset-trade-password`,
    { newPassword }
  );

  return res.data;
};

/* ================= RESET WATCH PASSWORD ================= */
export const resetWatchPassword = async (
  accountId: string,
  newPassword: string
) => {
  const res = await api.post(
    `/account-auth/${accountId}/reset-watch-password`,
    { newPassword }
  );

  return res.data;
};
