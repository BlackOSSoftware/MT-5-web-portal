/**
 * Our broker chart (candles + bid/ask from our API).
 * Engine: TradeCanvas ChartWidget — 76 drawing tools, indicators, layouts.
 * Data: broker DataFeed → `/api/v1/chart/candles` + live bid forming bar.
 */
export { default } from "./BrokerChartLite";
export type { ChartTradePosition, TradeOverlayProps } from "./chartTradeTypes";
