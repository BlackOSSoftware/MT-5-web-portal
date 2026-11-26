import type { ReactNode } from "react";
import {
  angleDeg,
  dashForStyle,
  dist,
  extendLine,
  midpoint,
  modifiedSchiffPivot,
  pitchforkRays,
  rayEnds,
  rgba,
  schiffPivot,
} from "./geometry";
import type { Drawing, DrawPoint, HoverPoint, XY } from "./types";

export type CoordFn = (time: number, price: number) => XY | null;

function strokeProps(d: Drawing) {
  return {
    stroke: d.style.color,
    strokeWidth: d.style.lineWidth,
    strokeDasharray: dashForStyle(d.style.lineStyle),
    fill: "none" as const,
  };
}

function fillProps(d: Drawing) {
  return rgba(d.style.fillColor || d.style.color, d.style.fillOpacity);
}

function mapPts(points: DrawPoint[], toXY: CoordFn): XY[] {
  return points.map((p) => toXY(p.time, p.price)).filter((p): p is XY => p != null);
}

function fibLevels(d: Drawing, y0: number, y1: number): { y: number; value: number; color: string }[] {
  const levels = d.style.levels.filter((l) => l.enabled);
  const reverse = d.style.reverse;
  return levels.map((l) => {
    const t = reverse ? 1 - l.value : l.value;
    return { y: y0 + (y1 - y0) * t, value: l.value, color: l.color };
  });
}

function Label({
  x,
  y,
  text,
  color,
  fontSize = 11,
  bold = false,
}: {
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize?: number;
  bold?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={fontSize}
      fontWeight={bold ? 600 : 400}
      style={{ paintOrder: "stroke", stroke: "var(--bg-card)", strokeWidth: 3 }}
    >
      {text}
    </text>
  );
}

function Handles({ pts, selected }: { pts: XY[]; selected: boolean }) {
  if (!selected) return null;
  return (
    <g style={{ pointerEvents: "auto", cursor: "move" }}>
      {pts.map((p, i) => (
        <rect
          key={i}
          x={p.x - 5}
          y={p.y - 5}
          width={10}
          height={10}
          fill="#fff"
          stroke="#2962FF"
          strokeWidth={1.5}
          style={{ cursor: "nwse-resize", pointerEvents: "auto" }}
        />
      ))}
    </g>
  );
}

function linePair(
  key: string,
  a: XY,
  b: XY,
  d: Drawing,
  w: number,
  h: number,
): ReactNode {
  let p1 = a;
  let p2 = b;
  if (d.kind === "extended" || (d.style.extendLeft && d.style.extendRight)) {
    [p1, p2] = extendLine(a, b, w, h, true, true);
  } else if (d.kind === "ray" || d.kind === "hray" || d.style.extendRight) {
    [p1, p2] = rayEnds(a, b, w, h);
  } else if (d.style.extendLeft) {
    [p1, p2] = extendLine(a, b, w, h, true, false);
  }
  return <line key={key} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} {...strokeProps(d)} />;
}

function renderFibRetracement(d: Drawing, pts: XY[], w: number, selected: boolean): ReactNode {
  if (pts.length < 2) return null;
  const x0 = Math.min(pts[0].x, pts[1].x);
  const x1 = d.style.extendRight ? w : Math.max(pts[0].x, pts[1].x);
  const levels = fibLevels(d, pts[0].y, pts[1].y);
  return (
    <g key={d.id}>
      {levels.map((lv, i) => {
        const prev = i > 0 ? levels[i - 1] : null;
        return (
          <g key={lv.value}>
            {prev ? (
              <rect
                x={x0}
                y={Math.min(prev.y, lv.y)}
                width={Math.max(0, x1 - x0)}
                height={Math.abs(lv.y - prev.y)}
                fill={rgba(lv.color, d.style.fillOpacity)}
                stroke="none"
              />
            ) : null}
            <line
              x1={x0}
              x2={x1}
              y1={lv.y}
              y2={lv.y}
              stroke={lv.color}
              strokeWidth={d.style.lineWidth}
              strokeDasharray={dashForStyle(d.style.lineStyle)}
            />
            {d.style.showLabels ? (
              <Label
                x={x1 + 4}
                y={lv.y - 2}
                text={`${lv.value} (${((pts[0].y + (pts[1].y - pts[0].y) * (d.style.reverse ? 1 - lv.value : lv.value))).toFixed(2)})`}
                color={lv.color}
              />
            ) : null}
          </g>
        );
      })}
      <Handles pts={pts} selected={selected} />
    </g>
  );
}

function renderPosition(d: Drawing, pts: XY[], selected: boolean, digits: number): ReactNode {
  if (pts.length < 2) return null;
  const isLong = d.kind === "longPosition";
  const entry = pts[0];
  const end = pts[1];
  const entryPrice = d.points[0].price;
  const stop = d.meta?.stopLoss ?? (isLong ? entryPrice * 0.99 : entryPrice * 1.01);
  const target = d.meta?.takeProfit ?? (isLong ? entryPrice * 1.02 : entryPrice * 0.98);
  // Approximate Y for SL/TP from linear map between entry and end price span
  const priceSpan = d.points[1].price - d.points[0].price || 1;
  const yFor = (price: number) => entry.y + ((price - entryPrice) / priceSpan) * (end.y - entry.y);
  const ySl = yFor(stop);
  const yTp = yFor(target);
  const x0 = Math.min(entry.x, end.x);
  const x1 = Math.max(entry.x, end.x);
  const width = Math.max(8, x1 - x0);
  const risk = Math.abs(entryPrice - stop);
  const reward = Math.abs(target - entryPrice);
  const rr = risk > 0 ? reward / risk : 0;
  const pnlPct = entryPrice !== 0 ? ((target - entryPrice) / entryPrice) * 100 * (isLong ? 1 : -1) : 0;

  return (
    <g key={d.id}>
      <rect
        x={x0}
        y={Math.min(entry.y, yTp)}
        width={width}
        height={Math.abs(yTp - entry.y)}
        fill={rgba("#22c55e", 0.15)}
        stroke="none"
      />
      <rect
        x={x0}
        y={Math.min(entry.y, ySl)}
        width={width}
        height={Math.abs(ySl - entry.y)}
        fill={rgba("#ef4444", 0.15)}
        stroke="none"
      />
      <line x1={x0} x2={x1} y1={entry.y} y2={entry.y} stroke="#2962FF" strokeWidth={1.5} />
      <line x1={x0} x2={x1} y1={yTp} y2={yTp} stroke="#22c55e" strokeWidth={1.25} />
      <line x1={x0} x2={x1} y1={ySl} y2={ySl} stroke="#ef4444" strokeWidth={1.25} />
      <Label
        x={x0 + 4}
        y={Math.min(entry.y, yTp) + 14}
        text={`RR ${rr.toFixed(2)} · TP ${target.toFixed(digits)} (${pnlPct.toFixed(2)}%)`}
        color="#22c55e"
        bold
      />
      <Label x={x0 + 4} y={Math.max(entry.y, ySl) - 4} text={`SL ${stop.toFixed(digits)}`} color="#ef4444" />
      <Handles pts={[entry, end, { x: (x0 + x1) / 2, y: ySl }, { x: (x0 + x1) / 2, y: yTp }]} selected={selected} />
    </g>
  );
}

function renderPitchfork(
  d: Drawing,
  pts: XY[],
  w: number,
  h: number,
  selected: boolean,
): ReactNode {
  if (pts.length < 3) return null;
  let p0 = pts[0];
  const p1 = pts[1];
  const p2 = pts[2];
  if (d.kind === "schiffPitchfork") p0 = schiffPivot(pts[0], p1, p2);
  if (d.kind === "modifiedSchiffPitchfork") p0 = modifiedSchiffPivot(pts[0], p1, p2);
  const rays = pitchforkRays(p0, p1, p2);
  const clip = (seg: [XY, XY]) => extendLine(seg[0], seg[1], w, h, false, true);
  const m = clip(rays.median);
  const u = clip(rays.upper);
  const l = clip(rays.lower);
  return (
    <g key={d.id}>
      <line x1={m[0].x} y1={m[0].y} x2={m[1].x} y2={m[1].y} {...strokeProps(d)} />
      <line x1={u[0].x} y1={u[0].y} x2={u[1].x} y2={u[1].y} {...strokeProps(d)} />
      <line x1={l[0].x} y1={l[0].y} x2={l[1].x} y2={l[1].y} {...strokeProps(d)} />
      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} {...strokeProps(d)} />
      <Handles pts={pts} selected={selected} />
    </g>
  );
}

function renderGannFan(d: Drawing, pts: XY[], w: number, h: number, selected: boolean): ReactNode {
  if (pts.length < 2) return null;
  const ratios = [1 / 8, 1 / 4, 1 / 3, 1 / 2, 1, 2, 3, 4, 8];
  const dx = pts[1].x - pts[0].x;
  const dy = pts[1].y - pts[0].y;
  return (
    <g key={d.id}>
      {ratios.map((r) => {
        const b = { x: pts[0].x + dx, y: pts[0].y + dy * r };
        const [a, c] = rayEnds(pts[0], b, w, h);
        return <line key={r} x1={a.x} y1={a.y} x2={c.x} y2={c.y} {...strokeProps(d)} />;
      })}
      <Handles pts={pts} selected={selected} />
    </g>
  );
}

function renderPattern(d: Drawing, pts: XY[], selected: boolean): ReactNode {
  if (pts.length < 2) return null;
  const labels =
    d.kind === "xabcd"
      ? ["X", "A", "B", "C", "D"]
      : d.kind === "abcd"
        ? ["A", "B", "C", "D"]
        : d.kind.startsWith("elliott")
          ? ["0", "1", "2", "3", "4", "5", "A", "B", "C", "D", "E"]
          : d.kind === "headShoulders"
            ? ["LS", "LH", "LN", "H", "RN", "RH", "RS"]
            : pts.map((_, i) => String(i + 1));
  return (
    <g key={d.id}>
      <polyline
        points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
        {...strokeProps(d)}
      />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3} fill={d.style.color} />
          <Label x={p.x + 6} y={p.y - 6} text={d.meta?.labelOverrides?.[String(i)] ?? labels[i] ?? ""} color={d.style.color} bold />
        </g>
      ))}
      <Handles pts={pts} selected={selected} />
    </g>
  );
}

export function renderDrawingNode(
  d: Drawing,
  toXY: CoordFn,
  w: number,
  h: number,
  selected: boolean,
  digits: number,
): ReactNode {
  if (!d.visible) return null;
  const pts = mapPts(d.points, toXY);
  const pathPts = d.path ? mapPts(d.path, toXY) : [];

  if (pathPts.length >= 2 && (d.kind === "brush" || d.kind === "highlighter" || d.kind === "freehand" || d.kind === "arrowMarker")) {
    const opacity = d.kind === "highlighter" ? Math.max(d.style.fillOpacity, 0.35) : 1;
    return (
      <g key={d.id} opacity={opacity}>
        <polyline
          points={pathPts.map((p) => `${p.x},${p.y}`).join(" ")}
          stroke={d.style.color}
          strokeWidth={d.kind === "highlighter" ? Math.max(8, d.style.lineWidth * 4) : d.style.lineWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Handles pts={pathPts.filter((_, i) => i === 0 || i === pathPts.length - 1)} selected={selected} />
      </g>
    );
  }

  switch (d.kind) {
    case "hline":
      if (!pts[0]) return null;
      return (
        <g key={d.id}>
          <line x1={0} x2={w} y1={pts[0].y} y2={pts[0].y} {...strokeProps(d)} />
          {d.style.showLabels ? (
            <Label x={w - 8} y={pts[0].y - 4} text={d.points[0].price.toFixed(digits)} color={d.style.color} />
          ) : null}
          <Handles pts={pts} selected={selected} />
        </g>
      );
    case "hray":
      if (!pts[0]) return null;
      return (
        <g key={d.id}>
          <line x1={pts[0].x} x2={w} y1={pts[0].y} y2={pts[0].y} {...strokeProps(d)} />
          <Handles pts={pts} selected={selected} />
        </g>
      );
    case "vline":
      if (!pts[0]) return null;
      return (
        <g key={d.id}>
          <line x1={pts[0].x} x2={pts[0].x} y1={0} y2={h} {...strokeProps(d)} />
          <Handles pts={pts} selected={selected} />
        </g>
      );
    case "crossLine":
      if (!pts[0]) return null;
      return (
        <g key={d.id}>
          <line x1={0} x2={w} y1={pts[0].y} y2={pts[0].y} {...strokeProps(d)} />
          <line x1={pts[0].x} x2={pts[0].x} y1={0} y2={h} {...strokeProps(d)} />
          <Handles pts={pts} selected={selected} />
        </g>
      );
    case "trend":
    case "extended":
    case "ray":
    case "infoLine":
    case "arrow":
    case "arrowMarker":
      if (pts.length < 2) return null;
      return (
        <g key={d.id}>
          {linePair(d.id, pts[0], pts[1], d, w, h)}
          {d.kind === "infoLine" ? (
            <Label
              x={midpoint(pts[0], pts[1]).x + 6}
              y={midpoint(pts[0], pts[1]).y - 6}
              text={`${angleDeg(pts[0], pts[1]).toFixed(1)}° · Δ${(d.points[1].price - d.points[0].price).toFixed(digits)}`}
              color={d.style.color}
            />
          ) : null}
          {(d.kind === "arrow" || d.kind === "arrowMarker") && pts.length >= 2 ? (
            <polygon
              points={arrowHead(pts[0], pts[1])}
              fill={d.style.color}
              stroke="none"
            />
          ) : null}
          <Handles pts={pts} selected={selected} />
        </g>
      );
    case "trendAngle":
      if (pts.length < 2) return null;
      return (
        <g key={d.id}>
          {linePair(d.id, pts[0], pts[1], d, w, h)}
          <Label
            x={pts[1].x + 6}
            y={pts[1].y - 6}
            text={`${angleDeg(pts[0], pts[1]).toFixed(1)}°`}
            color={d.style.color}
            bold
          />
          <Handles pts={pts} selected={selected} />
        </g>
      );
    case "rect":
    case "gannBox":
    case "gannSquare":
    case "gannSquareFixed":
    case "gannSquare144":
    case "datePriceRange":
    case "measDatePriceRange": {
      if (pts.length < 2) return null;
      const x = Math.min(pts[0].x, pts[1].x);
      const y = Math.min(pts[0].y, pts[1].y);
      const rw = Math.abs(pts[1].x - pts[0].x);
      const rh = Math.abs(pts[1].y - pts[0].y);
      const grid =
        d.kind.startsWith("gann") ? (
          <>
            {[0.25, 0.5, 0.75].map((t) => (
              <g key={t}>
                <line x1={x + rw * t} y1={y} x2={x + rw * t} y2={y + rh} stroke={d.style.color} strokeWidth={0.75} opacity={0.5} />
                <line x1={x} y1={y + rh * t} x2={x + rw} y2={y + rh * t} stroke={d.style.color} strokeWidth={0.75} opacity={0.5} />
              </g>
            ))}
          </>
        ) : null;
      return (
        <g key={d.id}>
          <rect x={x} y={y} width={rw} height={rh} fill={fillProps(d)} stroke={d.style.color} strokeWidth={d.style.lineWidth} strokeDasharray={dashForStyle(d.style.lineStyle)} />
          {grid}
          <Handles pts={pts} selected={selected} />
        </g>
      );
    }
    case "rotatedRect":
    case "ellipse": {
      if (pts.length < 2) return null;
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;
      const rx = Math.abs(pts[1].x - pts[0].x) / 2;
      const ry = Math.abs(pts[1].y - pts[0].y) / 2;
      return (
        <g key={d.id}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fillProps(d)} stroke={d.style.color} strokeWidth={d.style.lineWidth} strokeDasharray={dashForStyle(d.style.lineStyle)} />
          <Handles pts={pts} selected={selected} />
        </g>
      );
    }
    case "circle": {
      if (pts.length < 2) return null;
      const r = dist(pts[0], pts[1]);
      return (
        <g key={d.id}>
          <circle cx={pts[0].x} cy={pts[0].y} r={r} fill={fillProps(d)} stroke={d.style.color} strokeWidth={d.style.lineWidth} strokeDasharray={dashForStyle(d.style.lineStyle)} />
          <Handles pts={pts} selected={selected} />
        </g>
      );
    }
    case "triangle":
    case "polyline":
    case "path":
    case "curve":
    case "arc":
    case "doubleCurve":
    case "tripleCurve":
      if (pts.length < 2) return null;
      if (d.kind === "triangle" && pts.length >= 3) {
        return (
          <g key={d.id}>
            <polygon
              points={pts
                .slice(0, 3)
                .map((p) => `${p.x},${p.y}`)
                .join(" ")}
              fill={fillProps(d)}
              stroke={d.style.color}
              strokeWidth={d.style.lineWidth}
              strokeDasharray={dashForStyle(d.style.lineStyle)}
            />
            <Handles pts={pts.slice(0, 3)} selected={selected} />
          </g>
        );
      }
      return (
        <g key={d.id}>
          <polyline
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={d.style.color}
            strokeWidth={d.style.lineWidth}
            strokeDasharray={dashForStyle(d.style.lineStyle)}
          />
          <Handles pts={pts} selected={selected} />
        </g>
      );
    case "text":
    case "anchoredText":
    case "note":
    case "callout":
    case "priceLabel":
    case "flag":
    case "arrowUp":
    case "arrowDown":
    case "image": {
      if (!pts[0]) return null;
      const t = d.text || (d.kind === "priceLabel" ? d.points[0].price.toFixed(digits) : d.kind === "flag" ? "⚑" : d.kind === "arrowUp" ? "▲" : d.kind === "arrowDown" ? "▼" : "");
      const pad = 6;
      const fontSize = d.style.fontSize;
      const approxW = Math.max(24, t.length * fontSize * 0.55);
      const boxH = fontSize + pad * 2;
      return (
        <g key={d.id}>
          {(d.kind === "note" || d.kind === "callout" || d.kind === "priceLabel") && (
            <rect
              x={pts[0].x}
              y={pts[0].y - boxH}
              width={approxW + pad}
              height={boxH}
              rx={3}
              fill={rgba(d.style.fillColor || "#1e222d", 0.92)}
              stroke={d.style.color}
              strokeWidth={1}
            />
          )}
          {d.kind === "callout" && pts.length >= 2 ? (
            <line x1={pts[0].x} y1={pts[0].y} x2={pts[1].x} y2={pts[1].y} {...strokeProps(d)} />
          ) : null}
          <text
            x={pts[0].x + (d.kind === "note" || d.kind === "callout" || d.kind === "priceLabel" ? pad : 4)}
            y={pts[0].y - (d.kind === "note" || d.kind === "callout" || d.kind === "priceLabel" ? pad + 2 : 4)}
            fill={d.style.textColor || d.style.color}
            fontSize={fontSize}
            fontFamily={d.style.fontFamily}
            fontWeight={d.style.fontBold ? 700 : 400}
            fontStyle={d.style.fontItalic ? "italic" : "normal"}
            textAnchor={d.style.textAlign === "center" ? "middle" : d.style.textAlign === "right" ? "end" : "start"}
            style={{ paintOrder: "stroke", stroke: "var(--bg-card)", strokeWidth: 3 }}
          >
            {t}
          </text>
          <Handles pts={pts} selected={selected} />
        </g>
      );
    }
    case "fibRetracement":
    case "fibChannel":
      return renderFibRetracement(d, pts, w, selected);
    case "fibExtension":
    case "fibTime": {
      if (pts.length < 3) return renderFibRetracement(d, pts, w, selected);
      // Use A-B for range, project from C
      const y0 = pts[2].y;
      const span = pts[1].y - pts[0].y;
      const fake: XY[] = [pts[2], { x: pts[2].x + (pts[1].x - pts[0].x), y: y0 + span }];
      return renderFibRetracement(d, fake, w, selected);
    }
    case "fibTimeZones": {
      if (pts.length < 2) return null;
      const dx = pts[1].x - pts[0].x;
      return (
        <g key={d.id}>
          {d.style.levels.filter((l) => l.enabled).map((l) => {
            const x = pts[0].x + dx * l.value;
            return (
              <g key={l.value}>
                <line x1={x} x2={x} y1={0} y2={h} stroke={l.color} strokeWidth={d.style.lineWidth} strokeDasharray={dashForStyle(d.style.lineStyle)} />
                {d.style.showLabels ? <Label x={x + 4} y={16} text={String(l.value)} color={l.color} /> : null}
              </g>
            );
          })}
          <Handles pts={pts} selected={selected} />
        </g>
      );
    }
    case "fibCircles":
    case "fibArcs":
    case "fibSpiral":
    case "fibWedge":
    case "fibFan": {
      if (pts.length < 2) return null;
      if (d.kind === "fibFan") return renderGannFan(d, pts, w, h, selected);
      const r0 = dist(pts[0], pts[1]);
      return (
        <g key={d.id}>
          {d.style.levels.filter((l) => l.enabled).map((l) => (
            <circle
              key={l.value}
              cx={pts[0].x}
              cy={pts[0].y}
              r={Math.max(1, r0 * l.value)}
              fill="none"
              stroke={l.color}
              strokeWidth={d.style.lineWidth}
              strokeDasharray={dashForStyle(d.style.lineStyle)}
            />
          ))}
          <Handles pts={pts} selected={selected} />
        </g>
      );
    }
    case "gannFan":
    case "gannGrid":
      return renderGannFan(d, pts, w, h, selected);
    case "parallelChannel":
    case "disjointChannel":
    case "flatTopBottom":
    case "regressionTrend": {
      if (pts.length < 2) return null;
      const a = pts[0];
      const b = pts[1];
      const c = pts[2] ?? { x: a.x, y: a.y + (b.y - a.y) * 0.35 + 40 };
      const off = { x: c.x - a.x, y: c.y - a.y };
      const b2 = { x: b.x + off.x, y: b.y + off.y };
      const [l1a, l1b] = extendLine(a, b, w, h, true, true);
      const [l2a, l2b] = extendLine(c, b2, w, h, true, true);
      return (
        <g key={d.id}>
          <polygon
            points={`${l1a.x},${l1a.y} ${l1b.x},${l1b.y} ${l2b.x},${l2b.y} ${l2a.x},${l2a.y}`}
            fill={fillProps(d)}
            stroke="none"
          />
          <line x1={l1a.x} y1={l1a.y} x2={l1b.x} y2={l1b.y} {...strokeProps(d)} />
          <line x1={l2a.x} y1={l2a.y} x2={l2b.x} y2={l2b.y} {...strokeProps(d)} />
          <Handles pts={[a, b, c]} selected={selected} />
        </g>
      );
    }
    case "pitchfork":
    case "schiffPitchfork":
    case "modifiedSchiffPitchfork":
    case "insidePitchfork":
      return renderPitchfork(d, pts, w, h, selected);
    case "longPosition":
    case "shortPosition":
      return renderPosition(d, pts, selected, digits);
    case "xabcd":
    case "abcd":
    case "trianglePattern":
    case "headShoulders":
    case "elliottImpulse":
    case "elliottCorrection":
    case "elliottTriangle":
    case "elliottDouble":
    case "elliottTriple":
    case "threeDrives":
      return renderPattern(d, pts, selected);
    case "priceRange":
    case "measPriceRange": {
      if (pts.length < 2) return null;
      const x = (pts[0].x + pts[1].x) / 2;
      return (
        <g key={d.id}>
          <line x1={x} y1={pts[0].y} x2={x} y2={pts[1].y} {...strokeProps(d)} />
          <line x1={x - 10} y1={pts[0].y} x2={x + 10} y2={pts[0].y} {...strokeProps(d)} />
          <line x1={x - 10} y1={pts[1].y} x2={x + 10} y2={pts[1].y} {...strokeProps(d)} />
          <Label
            x={x + 12}
            y={(pts[0].y + pts[1].y) / 2}
            text={`${Math.abs(d.points[1].price - d.points[0].price).toFixed(digits)}`}
            color={d.style.color}
            bold
          />
          <Handles pts={pts} selected={selected} />
        </g>
      );
    }
    case "dateRange":
    case "timeCycle":
    case "cyclicLines": {
      if (pts.length < 2) return null;
      const y = (pts[0].y + pts[1].y) / 2;
      return (
        <g key={d.id}>
          <line x1={pts[0].x} y1={y} x2={pts[1].x} y2={y} {...strokeProps(d)} />
          <line x1={pts[0].x} y1={y - 10} x2={pts[0].x} y2={y + 10} {...strokeProps(d)} />
          <line x1={pts[1].x} y1={y - 10} x2={pts[1].x} y2={y + 10} {...strokeProps(d)} />
          <Handles pts={pts} selected={selected} />
        </g>
      );
    }
    case "forecast":
    case "projection":
    case "barsPattern":
    case "ghostFeed":
      if (pts.length < 2) return null;
      return (
        <g key={d.id} opacity={0.7}>
          <line x1={pts[0].x} y1={pts[0].y} x2={pts[1].x} y2={pts[1].y} {...strokeProps(d)} strokeDasharray="2 4" />
          <Handles pts={pts} selected={selected} />
        </g>
      );
    default:
      if (pts.length >= 2) {
        return (
          <g key={d.id}>
            <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} {...strokeProps(d)} />
            <Handles pts={pts} selected={selected} />
          </g>
        );
      }
      if (pts[0]) return <Handles key={d.id} pts={pts} selected={selected} />;
      return null;
  }
}

function arrowHead(a: XY, b: XY): string {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const size = 10;
  const p1 = { x: b.x - size * Math.cos(ang - 0.4), y: b.y - size * Math.sin(ang - 0.4) };
  const p2 = { x: b.x - size * Math.cos(ang + 0.4), y: b.y - size * Math.sin(ang + 0.4) };
  return `${b.x},${b.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`;
}

export function renderPreview(
  kind: Drawing["kind"],
  pending: DrawPoint[],
  hover: HoverPoint | null,
  toXY: CoordFn,
  w: number,
  h: number,
  style: Drawing["style"],
): ReactNode {
  if (!hover || pending.length === 0) return null;
  const draft: Drawing = {
    id: "__preview",
    kind,
    symbol: "",
    timeframe: "",
    points: [...pending, { time: hover.time, price: hover.price }],
    style,
    visible: true,
    locked: false,
    zIndex: 9999,
    createdAt: 0,
    updatedAt: 0,
  };
  return renderDrawingNode(draft, toXY, w, h, false, 5);
}
