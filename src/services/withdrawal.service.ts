import api from "@/api/axios";

export const getWithdrawals = async (page = 1, limit = 10) => {
  const { data } = await api.get("/withdrawals", {
    params: { page, limit },
  });
  return data.data;
};

export const createWithdrawal = async (payload: any) => {
  try {
    const { data } = await api.post("/withdrawals", payload);
    return data;
  } catch (error: any) {
    throw error?.response?.data || error;
  }
};