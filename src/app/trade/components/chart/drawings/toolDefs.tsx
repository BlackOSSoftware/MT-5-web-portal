import type { ReactNode } from "react";
import type { DrawTool, DrawingKind } from "./types";

export type ToolGroupId =
  | "cursor"
  | "trend"
  | "fibonacci"
  | "gann"
  | "shapes"
  | "annotation"
  | "patterns"
  | "prediction"
  | "brush"
  | "controls";

export type ToolDef = {
  key: DrawTool;
  label: string;
  shortcut?: string;
  group: ToolGroupId;
};

export type GroupDef = {
  id: ToolGroupId;
  label: string;
  /** Default / representative tool shown on the collapsed rail button. */
  primary: DrawTool;
  tools: ToolDef[];
};

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d={d} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const TOOL_ICONS: Partial<Record<DrawTool | "clear" | "lock" | "hide" | "magnet" | "stay" | "collapse", ReactNode>> = {
  cursor: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 3l6 16 2-6 6-2L5 3z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  ),
  crosshair: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12h16M12 4v16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.25" fill="currentColor" />
    </svg>
  ),
  dot: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
  eraser: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 15.5 14.5 8a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3L11 19.5H7v-4Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M5 19.5h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  trend: <Icon d="M5 17 L19 7" />,
  extended: <Icon d="M3 18 L21 6" />,
  ray: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 17 L16 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M14 8h4v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  trendAngle: <Icon d="M4 18h14M4 18l10-10" />,
  infoLine: <Icon d="M5 17 L19 7 M12 5v3" />,
  hline: <Icon d="M4 12h16" />,
  hray: <Icon d="M4 12h12 M14 9l4 3-4 3" />,
  vline: <Icon d="M12 4v16" />,
  crossLine: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12h16M12 4v16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  parallelChannel: <Icon d="M4 16l12-10M6 20l12-10" />,
  pitchfork: <Icon d="M12 20V10M6 16l6-6 6 6" />,
  fibRetracement: <Icon d="M5 6h14M5 12h14M5 18h10" />,
  fibExtension: <Icon d="M5 18l6-12 4 6 4-4" />,
  rect: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="6" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
  circle: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
  ellipse: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <ellipse cx="12" cy="12" rx="8" ry="5.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
  triangle: <Icon d="M12 5l8 14H4L12 5z" />,
  polyline: <Icon d="M4 16l5-8 5 5 6-9" />,
  path: <Icon d="M4 18c4-10 6 2 10-6 2 4 4 2 6 0" />,
  text: <Icon d="M6 7h12M12 7v11" />,
  note: <Icon d="M7 5h10v10l-3 3H7V5z" />,
  callout: <Icon d="M6 6h12v8H10l-4 3V6z" />,
  priceLabel: <Icon d="M5 12h10l3-3-3-3H5v6z" />,
  flag: <Icon d="M6 20V5l10 4-10 4" />,
  arrowUp: <Icon d="M12 19V6M8 10l4-4 4 4" />,
  arrowDown: <Icon d="M12 5v13M8 14l4 4 4-4" />,
  arrow: <Icon d="M5 12h12M13 8l4 4-4 4" />,
  brush: <Icon d="M5 17c4-2 4-8 8-10 2 4 4 6 6 6" />,
  highlighter: <Icon d="M6 16l8-10 4 3-8 10H6v-3z" />,
  freehand: <Icon d="M4 16c3-8 5 2 8-4s5-2 8 2" />,
  longPosition: <Icon d="M8 16V8l4-3 4 3v8H8z" />,
  shortPosition: <Icon d="M8 8v8l4 3 4-3V8H8z" />,
  xabcd: <Icon d="M4 16l4-10 4 6 4-8 4 10" />,
  abcd: <Icon d="M4 16l5-10 5 8 6-10" />,
  gannFan: <Icon d="M5 19V5h14M5 19l6-8 4 3 5-8" />,
  gannBox: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="5" width="14" height="14" stroke="currentColor" strokeWidth="1.75" />
      <path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  ),
  magnet: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 4v8a5 5 0 0 0 10 0V4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M7 4h3v4H7V4zm7 0h3v4h-3V4z" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
  stay: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
  lock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6" y="11" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M9 11V8a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  hide: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  ),
  clear: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  collapse: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const trendTools: ToolDef[] = [
  { key: "trend", label: "Trend Line", shortcut: "Alt+T", group: "trend" },
  { key: "extended", label: "Extended Line", group: "trend" },
  { key: "trendAngle", label: "Trend Angle", group: "trend" },
  { key: "ray", label: "Ray", group: "trend" },
  { key: "infoLine", label: "Info Line", group: "trend" },
  { key: "hline", label: "Horizontal Line", shortcut: "Alt+H", group: "trend" },
  { key: "hray", label: "Horizontal Ray", group: "trend" },
  { key: "vline", label: "Vertical Line", shortcut: "Alt+V", group: "trend" },
  { key: "crossLine", label: "Cross Line", group: "trend" },
  { key: "parallelChannel", label: "Parallel Channel", group: "trend" },
  { key: "disjointChannel", label: "Disjoint Channel", group: "trend" },
  { key: "regressionTrend", label: "Regression Trend", group: "trend" },
  { key: "flatTopBottom", label: "Flat Top/Bottom", group: "trend" },
  { key: "pitchfork", label: "Pitchfork", group: "trend" },
  { key: "schiffPitchfork", label: "Schiff Pitchfork", group: "trend" },
  { key: "modifiedSchiffPitchfork", label: "Modified Schiff Pitchfork", group: "trend" },
  { key: "insidePitchfork", label: "Inside Pitchfork", group: "trend" },
];

const fibTools: ToolDef[] = [
  { key: "fibRetracement", label: "Fib Retracement", shortcut: "Alt+F", group: "fibonacci" },
  { key: "fibExtension", label: "Trend-Based Fib Extension", group: "fibonacci" },
  { key: "fibChannel", label: "Fib Channel", group: "fibonacci" },
  { key: "fibTimeZones", label: "Fib Time Zones", group: "fibonacci" },
  { key: "fibCircles", label: "Fib Circles", group: "fibonacci" },
  { key: "fibArcs", label: "Fib Arcs", group: "fibonacci" },
  { key: "fibFan", label: "Fib Speed Resistance Fan", group: "fibonacci" },
  { key: "fibTime", label: "Trend-Based Fib Time", group: "fibonacci" },
  { key: "fibWedge", label: "Fib Wedge", group: "fibonacci" },
  { key: "fibSpiral", label: "Fib Spiral", group: "fibonacci" },
];

const gannTools: ToolDef[] = [
  { key: "gannBox", label: "Gann Box", group: "gann" },
  { key: "gannFan", label: "Gann Fan", group: "gann" },
  { key: "gannSquareFixed", label: "Gann Square Fixed", group: "gann" },
  { key: "gannSquare", label: "Gann Square", group: "gann" },
  { key: "gannSquare144", label: "Gann Square 144", group: "gann" },
  { key: "gannGrid", label: "Gann Grid", group: "gann" },
];

const shapeTools: ToolDef[] = [
  { key: "rect", label: "Rectangle", shortcut: "Alt+R", group: "shapes" },
  { key: "rotatedRect", label: "Rotated Rectangle", group: "shapes" },
  { key: "path", label: "Path", group: "shapes" },
  { key: "circle", label: "Circle", group: "shapes" },
  { key: "ellipse", label: "Ellipse", group: "shapes" },
  { key: "triangle", label: "Triangle", group: "shapes" },
  { key: "polyline", label: "Polyline", group: "shapes" },
  { key: "curve", label: "Curve", group: "shapes" },
  { key: "arc", label: "Arc", group: "shapes" },
  { key: "doubleCurve", label: "Double Curve", group: "shapes" },
  { key: "tripleCurve", label: "Triple Curve", group: "shapes" },
  { key: "timeCycle", label: "Time Cycle", group: "shapes" },
  { key: "priceRange", label: "Price Range", group: "shapes" },
  { key: "datePriceRange", label: "Date and Price Range", group: "shapes" },
];

const annotationTools: ToolDef[] = [
  { key: "text", label: "Text", shortcut: "Alt+X", group: "annotation" },
  { key: "anchoredText", label: "Anchored Text", group: "annotation" },
  { key: "note", label: "Note", group: "annotation" },
  { key: "callout", label: "Callout", group: "annotation" },
  { key: "priceLabel", label: "Price Label", group: "annotation" },
  { key: "flag", label: "Flag Mark", group: "annotation" },
  { key: "arrowUp", label: "Arrow Mark Up", group: "annotation" },
  { key: "arrowDown", label: "Arrow Mark Down", group: "annotation" },
  { key: "arrow", label: "Arrow", group: "annotation" },
  { key: "image", label: "Image Annotation", group: "annotation" },
];

const patternTools: ToolDef[] = [
  { key: "xabcd", label: "XABCD Pattern", group: "patterns" },
  { key: "abcd", label: "ABCD Pattern", group: "patterns" },
  { key: "trianglePattern", label: "Triangle Pattern", group: "patterns" },
  { key: "headShoulders", label: "Head and Shoulders", group: "patterns" },
  { key: "elliottImpulse", label: "Elliott Impulse Wave", group: "patterns" },
  { key: "elliottCorrection", label: "Elliott Correction Wave", group: "patterns" },
  { key: "elliottTriangle", label: "Elliott Triangle Wave", group: "patterns" },
  { key: "elliottDouble", label: "Elliott Double Combo", group: "patterns" },
  { key: "elliottTriple", label: "Elliott Triple Combo", group: "patterns" },
  { key: "threeDrives", label: "Three Drives Pattern", group: "patterns" },
  { key: "cyclicLines", label: "Cyclic Lines", group: "patterns" },
];

const predictionTools: ToolDef[] = [
  { key: "longPosition", label: "Long Position", group: "prediction" },
  { key: "shortPosition", label: "Short Position", group: "prediction" },
  { key: "forecast", label: "Forecast", group: "prediction" },
  { key: "barsPattern", label: "Bars Pattern", group: "prediction" },
  { key: "ghostFeed", label: "Ghost Feed", group: "prediction" },
  { key: "projection", label: "Projection", group: "prediction" },
  { key: "dateRange", label: "Date Range", group: "prediction" },
  { key: "measPriceRange", label: "Price Range", group: "prediction" },
  { key: "measDatePriceRange", label: "Date and Price Range", group: "prediction" },
];

const brushTools: ToolDef[] = [
  { key: "brush", label: "Brush", group: "brush" },
  { key: "highlighter", label: "Highlighter", group: "brush" },
  { key: "arrowMarker", label: "Arrow Marker", group: "brush" },
  { key: "freehand", label: "Freehand Drawing", group: "brush" },
];

export const TOOL_GROUPS: GroupDef[] = [
  {
    id: "cursor",
    label: "Cursor",
    primary: "cursor",
    tools: [
      { key: "cursor", label: "Cursor", shortcut: "Escape", group: "cursor" },
      { key: "crosshair", label: "Crosshair", group: "cursor" },
      { key: "dot", label: "Dot", group: "cursor" },
      { key: "eraser", label: "Eraser", group: "cursor" },
    ],
  },
  { id: "trend", label: "Trend Line Tools", primary: "trend", tools: trendTools },
  { id: "fibonacci", label: "Gann and Fibonacci Tools", primary: "fibRetracement", tools: fibTools },
  { id: "gann", label: "Gann Tools", primary: "gannFan", tools: gannTools },
  { id: "shapes", label: "Geometric Shapes", primary: "rect", tools: shapeTools },
  { id: "annotation", label: "Annotation Tools", primary: "text", tools: annotationTools },
  { id: "patterns", label: "Patterns", primary: "xabcd", tools: patternTools },
  { id: "prediction", label: "Prediction and Measurement", primary: "longPosition", tools: predictionTools },
  { id: "brush", label: "Brushes", primary: "brush", tools: brushTools },
];

export function isDrawingKind(tool: DrawTool): tool is DrawingKind {
  return (
    tool !== "cursor" &&
    tool !== "crosshair" &&
    tool !== "dot" &&
    tool !== "eraser"
  );
}

export function labelForTool(tool: DrawTool): string {
  for (const g of TOOL_GROUPS) {
    const found = g.tools.find((t) => t.key === tool);
    if (found) return found.label;
  }
  return tool;
}
