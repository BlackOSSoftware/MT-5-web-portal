import api from "@/api/axios";

export interface WalletTransaction {
  _id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  balanceAfter: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  referenceType?: string;
  remark?: string;
  createdAt: string;
  account?: {
    _id: string;
    account_number?: string;
    account_type?: string;
    status?: string;
  } | null;
}

export interface WalletSummary {
  balance: number;
  holdBalance: number;
  availableBalance: number;
  pendingWithdrawals: number;
  transactions: WalletTransaction[];
}

export interface WalletTransferPayload {
  direction: "TO_ACCOUNT" | "FROM_ACCOUNT";
  accountId: string;
  amount: number;
}

export interface WalletWithdrawPayload {
  amount: number;
  method: string;
  payout: Record<string, string>;
}

export const walletService = {
  getWallet: async (): Promise<WalletSummary> => {
    const res = await api.get("/wallet");
    return res.data?.data;
  },

  getTransactions: async (page = 1, limit = 10) => {
    const res = await api.get("/wallet/transactions", {
      params: { page, limit },
    });
    return res.data;
  },

  transfer: async (payload: WalletTransferPayload) => {
    const res = await api.post("/wallet/transfer", payload);
    return res.data;
  },

  withdraw: async (payload: WalletWithdrawPayload) => {
    const res = await api.post("/wallet/withdraw", payload);
    return res.data;
  },

  getWithdrawals: async (page = 1, limit = 10) => {
    const res = await api.get("/wallet/withdrawals", {
      params: { page, limit },
    });
    return res.data;
  },
};
