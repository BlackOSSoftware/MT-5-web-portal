import api from "@/api/axios";

export interface InternalTransferPayload {
  fromAccount: string;
  toAccount: string;
  amount: number;
}

export interface InternalTransferHistoryParams {
  page?: number;
  limit?: number;
}

export const internalTransferService = {
  // POST transfer
  createTransfer: async (payload: InternalTransferPayload) => {
    const response = await api.post("/internal-transfer", payload);
    return response.data;
  },

  // GET transfer history
  getTransferHistory: async (params: InternalTransferHistoryParams) => {
    const response = await api.get("/internal-transfer", {
      params,
    });
    return response.data;
  },
};
