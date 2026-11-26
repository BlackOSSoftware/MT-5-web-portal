import {
  dist,
  distToInfiniteLine,
  distToSegment,
  pointInRect,
} from "./geometry";
import type { Drawing, XY } from "./types";

const HIT = 7;

export type CoordFn = (time: number, price: number) => XY | null;

function ptsOf(d: Drawing, toXY: CoordFn): XY[] {
  return d.points.map((p) => toXY(p.time, p.price)).filter((p): p is XY => p != null);
}

export function hitTestDrawing(d: Drawing, x: number, y: number, toXY: CoordFn, w: number, h: number): boolean {
  if (!d.visible) return false;
  const pts = ptsOf(d, toXY);
  const pathPts =
    d.path
      ?.map((p) => toXY(p.time, p.price))
      .filter((p): p is XY => p != null) ?? [];

  if (pathPts.length >= 2) {
    for (let i = 0; i < pathPts.length - 1; i++) {
      if (distToSegment(x, y, pathPts[i].x, pathPts[i].y, pathPts[i + 1].x, pathPts[i + 1].y) < HIT) {
        return true;
      }
    }
  }

  if (pts.length === 0) return false;

  switch (d.kind) {
    case "hline":
    case "hray":
      return Math.abs(y - pts[0].y) < HIT && (d.kind === "hline" || x >= pts[0].x - HIT);
    case "vline":
      return Math.abs(x - pts[0].x) < HIT;
    case "crossLine":
      return Math.abs(y - pts[0].y) < HIT || Math.abs(x - pts[0].x) < HIT;
    case "text":
    case "anchoredText":
    case "note":
    case "priceLabel":
    case "flag":
    case "arrowUp":
    case "arrowDown":
    case "image":
      return dist({ x, y }, pts[0]) < 16;
    case "rect":
    case "rotatedRect":
    case "gannBox":
    case "gannSquare":
    case "gannSquareFixed":
    case "gannSquare144":
    case "longPosition":
    case "shortPosition":
    case "datePriceRange":
    case "measDatePriceRange":
    case "priceRange":
    case "measPriceRange":
    case "dateRange":
      if (pts.length < 2) return false;
      return pointInRect(x, y, pts[0], pts[1], HIT);
    case "circle": {
      if (pts.length < 2) return false;
      const r = dist(pts[0], pts[1]);
      return Math.abs(dist({ x, y }, pts[0]) - r) < HIT;
    }
    case "ellipse": {
      if (pts.length < 2) return false;
      const rx = Math.abs(pts[1].x - pts[0].x);
      const ry = Math.abs(pts[1].y - pts[0].y);
      if (rx < 1 || ry < 1) return pointInRect(x, y, pts[0], pts[1], HIT);
      const nx = (x - pts[0].x) / rx;
      const ny = (y - pts[0].y) / ry;
      return Math.abs(nx * nx + ny * ny - 1) < 0.15;
    }
    case "extended":
    case "ray":
    case "trend":
    case "infoLine":
    case "trendAngle":
    case "arrow":
    case "arrowMarker": {
      if (pts.length < 2) return false;
      if (d.kind === "extended" || d.style.extendLeft || d.style.extendRight) {
        return distToInfiniteLine(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y) < HIT;
      }
      return distToSegment(x, y, pts[0].x, pts[0].y, pts[1].x, pts[1].y) < HIT;
    }
    default: {
      // Polylines / patterns / channels: segments between consecutive points
      for (let i = 0; i < pts.length - 1; i++) {
        if (distToSegment(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) < HIT) return true;
      }
      if (pts.length === 1) return dist({ x, y }, pts[0]) < HIT;
      // Fib / gann boxes already covered; also check bounding box for filled tools
      if (pts.length >= 2 && pointInRect(x, y, pts[0], pts[pts.length - 1], 0)) {
        const fibish =
          d.kind.startsWith("fib") ||
          d.kind.startsWith("gann") ||
          d.kind.includes("Channel") ||
          d.kind.includes("pitchfork") ||
          d.kind.includes("Pitchfork");
        if (fibish) return true;
      }
      void w;
      void h;
      return false;
    }
  }
}

export function hitTestHandle(d: Drawing, x: number, y: number, toXY: CoordFn): number {
  const pts = ptsOf(d, toXY);
  for (let i = 0; i < pts.length; i++) {
    if (dist({ x, y }, pts[i]) <= 8) return i;
  }
  return -1;
}

export function findTopHit(
  drawings: Drawing[],
  x: number,
  y: number,
  toXY: CoordFn,
  w: number,
  h: number,
): Drawing | null {
  const visible = drawings
    .filter((d) => d.visible)
    .slice()
    .sort((a, b) => b.zIndex - a.zIndex);
  for (const d of visible) {
    if (hitTestDrawing(d, x, y, toXY, w, h)) return d;
  }
  return null;
}
