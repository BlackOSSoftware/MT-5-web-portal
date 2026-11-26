export type ChartTradePosition = {
  positionId: string;
  side: "BUY" | "SELL";
  volume: number;
  openPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
};

export type TradeOverlayProps = {
  position: ChartTradePosition | null;
  onModify: (
    positionId: string,
    patch: { stopLoss?: number | null; takeProfit?: number | null },
  ) => Promise<void>;
};
