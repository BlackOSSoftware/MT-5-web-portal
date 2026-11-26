/** Shared drawing-object model for the broker chart overlay. */

export type DrawPoint = { time: number; price: number };

export type LineStyleKind = "solid" | "dashed" | "dotted";

export type FibLevel = {
  value: number;
  color: string;
  enabled: boolean;
};

export type DrawingStyle = {
  color: string;
  lineWidth: number;
  lineStyle: LineStyleKind;
  fillColor: string;
  fillOpacity: number;
  fontFamily: string;
  fontSize: number;
  fontBold: boolean;
  fontItalic: boolean;
  textColor: string;
  textAlign: "left" | "center" | "right";
  extendLeft: boolean;
  extendRight: boolean;
  showLabels: boolean;
  reverse: boolean;
  levels: FibLevel[];
};

/** All drawable tool kinds (cursor/control tools are separate). */
export type DrawingKind =
  | "trend"
  | "extended"
  | "trendAngle"
  | "ray"
  | "infoLine"
  | "hline"
  | "hray"
  | "vline"
  | "crossLine"
  | "parallelChannel"
  | "disjointChannel"
  | "regressionTrend"
  | "flatTopBottom"
  | "pitchfork"
  | "schiffPitchfork"
  | "modifiedSchiffPitchfork"
  | "insidePitchfork"
  | "fibRetracement"
  | "fibExtension"
  | "fibChannel"
  | "fibTimeZones"
  | "fibCircles"
  | "fibArcs"
  | "fibFan"
  | "fibTime"
  | "fibWedge"
  | "fibSpiral"
  | "gannBox"
  | "gannFan"
  | "gannSquareFixed"
  | "gannSquare"
  | "gannSquare144"
  | "gannGrid"
  | "rect"
  | "rotatedRect"
  | "path"
  | "circle"
  | "ellipse"
  | "triangle"
  | "polyline"
  | "curve"
  | "arc"
  | "doubleCurve"
  | "tripleCurve"
  | "timeCycle"
  | "priceRange"
  | "datePriceRange"
  | "text"
  | "anchoredText"
  | "note"
  | "callout"
  | "priceLabel"
  | "flag"
  | "arrowUp"
  | "arrowDown"
  | "arrow"
  | "image"
  | "xabcd"
  | "abcd"
  | "trianglePattern"
  | "headShoulders"
  | "elliottImpulse"
  | "elliottCorrection"
  | "elliottTriangle"
  | "elliottDouble"
  | "elliottTriple"
  | "threeDrives"
  | "cyclicLines"
  | "longPosition"
  | "shortPosition"
  | "forecast"
  | "barsPattern"
  | "ghostFeed"
  | "projection"
  | "dateRange"
  | "measPriceRange"
  | "measDatePriceRange"
  | "brush"
  | "highlighter"
  | "arrowMarker"
  | "freehand";

export type CursorTool =
  | "cursor"
  | "crosshair"
  | "dot"
  | "eraser";

export type ControlAction =
  | "magnet"
  | "stayInDrawing"
  | "lockAll"
  | "hideAll"
  | "removeAll";

export type DrawTool = CursorTool | DrawingKind;

export type DrawingMeta = {
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskReward?: number;
  angle?: number;
  imageUrl?: string;
  labelOverrides?: Record<string, string>;
};

export type Drawing = {
  id: string;
  kind: DrawingKind;
  symbol: string;
  timeframe: string;
  points: DrawPoint[];
  /** Freehand / brush stroke samples. */
  path?: DrawPoint[];
  text?: string;
  style: DrawingStyle;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  groupId?: string;
  createdAt: number;
  updatedAt: number;
  meta?: DrawingMeta;
};

export type DrawingTemplate = {
  id: string;
  name: string;
  kind: DrawingKind | "any";
  style: Partial<DrawingStyle>;
  createdAt: number;
  updatedAt: number;
};

export type XY = { x: number; y: number };

export type HoverPoint = XY & DrawPoint;

export type SelectionState = {
  ids: string[];
  /** Index of the anchor being dragged, or -1 for whole-object move. */
  handleIndex: number;
};

export type MagnetMode = "off" | "weak" | "strong";

export type DrawingEngineOptions = {
  symbol: string;
  timeframe: string;
  digits: number;
};
