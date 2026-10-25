export type OrderLevel = {
  price: string;
  volume: string;
};

export type OrderBookMessage = {
  type: "orderbook";
  market: string;
  data: {
    code: string;
    seq: string;
    tick_time: string;
    bids: OrderLevel[];
    asks: OrderLevel[];
    dayHigh?: number;
    dayLow?: number;
  };
};

export type PriceDirection = "up" | "down" | "same";

export type QuoteLiveState = {
  symbol: string;
  bid: string;
  ask: string;
  bidVolume: string;
  askVolume: string;
  bidDir: PriceDirection;
  askDir: PriceDirection;
  high?: number;
  low?: number;
  dayOpen?: number;
  dayClose?: number;
  tickTime?: string;
  change?: number;
  changePercent?: number;
};
