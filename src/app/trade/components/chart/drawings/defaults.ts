import type { DrawTool, DrawingKind, DrawingStyle, FibLevel } from "./types";

export const DEFAULT_DRAW_COLOR = "#2962FF";

export const DEFAULT_FIB_LEVELS: FibLevel[] = [
  { value: 0, color: "#787B86", enabled: true },
  { value: 0.236, color: "#F23645", enabled: true },
  { value: 0.382, color: "#FF9800", enabled: true },
  { value: 0.5, color: "#4CAF50", enabled: true },
  { value: 0.618, color: "#089981", enabled: true },
  { value: 0.786, color: "#00BCD4", enabled: true },
  { value: 1, color: "#787B86", enabled: true },
  { value: 1.272, color: "#2962FF", enabled: false },
  { value: 1.618, color: "#9C27B0", enabled: true },
  { value: 2, color: "#E91E63", enabled: false },
  { value: 2.618, color: "#673AB7", enabled: false },
  { value: 3.618, color: "#3F51B5", enabled: false },
  { value: 4.236, color: "#2196F3", enabled: false },
];

export function createDefaultStyle(partial?: Partial<DrawingStyle>): DrawingStyle {
  return {
    color: DEFAULT_DRAW_COLOR,
    lineWidth: 1.5,
    lineStyle: "dashed",
    fillColor: DEFAULT_DRAW_COLOR,
    fillOpacity: 0.08,
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 12,
    fontBold: true,
    fontItalic: false,
    textColor: DEFAULT_DRAW_COLOR,
    textAlign: "left",
    extendLeft: false,
    extendRight: false,
    showLabels: true,
    reverse: false,
    levels: DEFAULT_FIB_LEVELS.map((l) => ({ ...l })),
    ...partial,
  };
}

/** How many anchor clicks are required to finish a drawing (Infinity = open path). */
export function requiredPoints(kind: DrawingKind): number {
  switch (kind) {
    case "hline":
    case "vline":
    case "crossLine":
    case "text":
    case "anchoredText":
    case "note":
    case "priceLabel":
    case "flag":
    case "arrowUp":
    case "arrowDown":
    case "image":
      return 1;
    case "trend":
    case "extended":
    case "trendAngle":
    case "ray":
    case "infoLine":
    case "hray":
    case "rect":
    case "rotatedRect":
    case "circle":
    case "ellipse":
    case "arc":
    case "curve":
    case "timeCycle":
    case "priceRange":
    case "datePriceRange":
    case "dateRange":
    case "measPriceRange":
    case "measDatePriceRange":
    case "fibRetracement":
    case "fibChannel":
    case "fibTimeZones":
    case "fibCircles":
    case "fibArcs":
    case "fibFan":
    case "fibWedge":
    case "fibSpiral":
    case "gannBox":
    case "gannFan":
    case "gannSquareFixed":
    case "gannSquare":
    case "gannSquare144":
    case "gannGrid":
    case "arrow":
    case "arrowMarker":
    case "callout":
    case "longPosition":
    case "shortPosition":
    case "forecast":
    case "projection":
    case "barsPattern":
    case "ghostFeed":
    case "regressionTrend":
    case "flatTopBottom":
    case "cyclicLines":
      return 2;
    case "parallelChannel":
    case "disjointChannel":
    case "pitchfork":
    case "schiffPitchfork":
    case "modifiedSchiffPitchfork":
    case "insidePitchfork":
    case "triangle":
    case "fibExtension":
    case "fibTime":
    case "doubleCurve":
      return 3;
    case "tripleCurve":
    case "abcd":
      return 4;
    case "xabcd":
    case "trianglePattern":
    case "threeDrives":
      return 5;
    case "headShoulders":
      return 7;
    case "elliottImpulse":
      return 6;
    case "elliottCorrection":
      return 4;
    case "elliottTriangle":
      return 6;
    case "elliottDouble":
      return 7;
    case "elliottTriple":
      return 11;
    case "path":
    case "polyline":
      return Number.POSITIVE_INFINITY;
    case "brush":
    case "highlighter":
    case "freehand":
      return 2; // stroke finalized on pointer-up; path carries samples
    default:
      return 2;
  }
}

export function isFibKind(kind: DrawingKind): boolean {
  return kind.startsWith("fib");
}

export function isBrushKind(kind: DrawTool): boolean {
  return kind === "brush" || kind === "highlighter" || kind === "freehand" || kind === "arrowMarker";
}

export function isPositionKind(kind: DrawingKind): boolean {
  return kind === "longPosition" || kind === "shortPosition";
}

/** Legacy localStorage kinds → new kinds. */
export function migrateLegacyKind(kind: string): DrawingKind | null {
  const map: Record<string, DrawingKind> = {
    trend: "trend",
    ray: "ray",
    hline: "hline",
    vline: "vline",
    rect: "rect",
    text: "text",
  };
  return map[kind] ?? null;
}
