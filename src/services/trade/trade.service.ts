import tradeApi from "@/api/tradeApi";

export interface MarketOrderPayload {
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface PendingOrderPayload {
  symbol: string;
  side: "BUY" | "SELL";
  orderType:
    | "BUY_LIMIT"
    | "SELL_LIMIT"
    | "BUY_STOP"
    | "SELL_STOP";
  price: number;
  volume: number;
  stopLoss?: number;
  takeProfit?: number;
  expireType?: "GTC" | "TODAY" | "TIME";
  expireAt?: string;
}

export const tradeService = {
  market: async (payload: MarketOrderPayload) => {
    const { data } = await tradeApi.post("/trade/market", payload);
    return data;
  },

  pending: async (payload: PendingOrderPayload) => {
    const { data } = await tradeApi.post("/trade/pending", payload);
    return data;
  },
};
