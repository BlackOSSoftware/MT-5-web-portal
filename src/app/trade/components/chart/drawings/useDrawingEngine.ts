"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { CrosshairMode, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { createDefaultStyle, isBrushKind, isPositionKind, requiredPoints } from "./defaults";
import { constrainAngle, magnetSnap, newDrawingId, type OhlcBar } from "./geometry";
import { DrawingHistory, cloneDrawings } from "./history";
import { findTopHit, hitTestHandle } from "./hitTest";
import {
  createPersistController,
  fetchRemoteDrawings,
  loadLocalDrawings,
  loadTemplates,
  saveTemplates,
} from "./persistence";
import { isDrawingKind } from "./toolDefs";
import type {
  DrawPoint,
  DrawTool,
  Drawing,
  DrawingKind,
  DrawingStyle,
  DrawingTemplate,
  HoverPoint,
  MagnetMode,
  XY,
} from "./types";

type SeriesLike = ISeriesApi<"Candlestick"> | ISeriesApi<"Bar"> | ISeriesApi<"Line"> | ISeriesApi<"Area">;

type Args = {
  chartRef: MutableRefObject<IChartApi | null>;
  seriesRef: MutableRefObject<SeriesLike | null>;
  barsRef: MutableRefObject<OhlcBar[]>;
  symbol: string;
  timeframe: string;
  digits: number;
  wrapRef: MutableRefObject<HTMLDivElement | null>;
  sizeTick: number;
};

export function useDrawingEngine({
  chartRef,
  seriesRef,
  barsRef,
  symbol,
  timeframe,
  digits,
  wrapRef,
  sizeTick,
}: Args) {
  const [tool, setTool] = useState<DrawTool>("cursor");
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [pending, setPending] = useState<DrawPoint[]>([]);
  const [hover, setHover] = useState<HoverPoint | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [magnet, setMagnet] = useState<MagnetMode>("weak");
  const [stayInDrawing, setStayInDrawing] = useState(true);
  const [lockedAll, setLockedAll] = useState(false);
  const [hiddenAll, setHiddenAll] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [templates, setTemplates] = useState<DrawingTemplate[]>([]);
  const [clipboard, setClipboard] = useState<Drawing[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(true);

  const historyRef = useRef(new DrawingHistory());
  const persistRef = useRef(createPersistController());
  const brushPathRef = useRef<DrawPoint[]>([]);
  const dragRef = useRef<{
    mode: "move" | "handle";
    id: string;
    handleIndex: number;
    start: DrawPoint;
    origin: Drawing;
  } | null>(null);
  const altMagnetOffRef = useRef(false);
  const shiftAngleRef = useRef(false);
  const drawingsRef = useRef(drawings);
  drawingsRef.current = drawings;
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const styleDraftRef = useRef(createDefaultStyle());

  const toXY = useCallback(
    (time: number, price: number): XY | null => {
      const chart = chartRef.current;
      const series = seriesRef.current;
      if (!chart || !series) return null;
      const x = chart.timeScale().timeToCoordinate(time as UTCTimestamp);
      const y = series.priceToCoordinate(price);
      if (x == null || y == null) return null;
      return { x, y };
    },
    [chartRef, seriesRef],
  );

  const fromXY = useCallback(
    (x: number, y: number): DrawPoint | null => {
      const chart = chartRef.current;
      const series = seriesRef.current;
      if (!chart || !series) return null;
      const t = chart.timeScale().coordinateToTime(x);
      const price = series.coordinateToPrice(y);
      if (t == null || price == null || !Number.isFinite(price)) return null;
      let pt: DrawPoint = { time: Number(t), price };
      const magnetMode = altMagnetOffRef.current ? "off" : magnet;
      if (magnetMode !== "off") {
        pt = magnetSnap(pt.time, pt.price, barsRef.current, magnetMode);
      }
      return pt;
    },
    [chartRef, seriesRef, barsRef, magnet],
  );

  const commit = useCallback((next: Drawing[], pushHistory = true) => {
    if (pushHistory) historyRef.current.push(drawingsRef.current);
    setDrawings(next);
    persistRef.current.persist(symbol, timeframe, next);
  }, [symbol, timeframe]);

  // Load drawings: prefer remote when logged in, else local (incl. legacy migrate).
  useEffect(() => {
    let cancelled = false;
    setPending([]);
    setSelectedIds([]);
    setHover(null);
    historyRef.current.clear();
    const local = loadLocalDrawings(symbol, timeframe);
    setDrawings(local);
    setTemplates(loadTemplates());
    void fetchRemoteDrawings(symbol, timeframe).then((remote) => {
      if (cancelled || remote == null) return;
      // Prefer remote if non-empty; otherwise keep local and sync up.
      if (remote.length > 0) {
        setDrawings(remote);
      } else if (local.length > 0) {
        persistRef.current.persist(symbol, timeframe, local);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe]);

  useEffect(() => {
    if (hiddenAll) {
      setDrawings((prev) => prev.map((d) => ({ ...d, visible: false, updatedAt: Date.now() })));
    } else {
      setDrawings((prev) => {
        if (!prev.some((d) => !d.visible)) return prev;
        // Only restore if we previously hid all via toggle — keep individually hidden ones.
        return prev;
      });
    }
  }, [hiddenAll]);

  const finishDrawing = useCallback(
    (kind: DrawingKind, pts: DrawPoint[], extra?: Partial<Drawing>) => {
      const now = Date.now();
      const maxZ = drawingsRef.current.reduce((m, d) => Math.max(m, d.zIndex), 0);
      const style = createDefaultStyle(styleDraftRef.current);
      if (kind === "extended") {
        style.extendLeft = true;
        style.extendRight = true;
      }
      if (kind === "ray" || kind === "hray") style.extendRight = true;
      if (kind === "highlighter") {
        style.lineWidth = 10;
        style.fillOpacity = 0.35;
        style.color = "#FFEB3B";
      }
      let meta = extra?.meta;
      if (isPositionKind(kind) && pts.length >= 2) {
        const entry = pts[0].price;
        const isLong = kind === "longPosition";
        meta = {
          entry,
          stopLoss: isLong ? entry * 0.99 : entry * 1.01,
          takeProfit: isLong ? entry * 1.02 : entry * 0.98,
          riskReward: 2,
        };
      }
      const drawing: Drawing = {
        id: newDrawingId(kind),
        kind,
        symbol,
        timeframe,
        points: pts,
        style,
        visible: true,
        locked: lockedAll,
        zIndex: maxZ + 1,
        createdAt: now,
        updatedAt: now,
        ...extra,
        meta: meta ?? extra?.meta,
      };
      commit([...drawingsRef.current, drawing]);
      setPending([]);
      setSelectedIds([drawing.id]);
      if (!stayInDrawing) setTool("cursor");
    },
    [symbol, timeframe, lockedAll, stayInDrawing, commit],
  );

  const placePoint = useCallback(
    (raw: DrawPoint, screen?: XY) => {
      const t = toolRef.current;
      if (!isDrawingKind(t)) return;
      let pt = raw;
      if (shiftAngleRef.current && pending.length >= 1 && screen) {
        const a = toXY(pending[0].time, pending[0].price);
        if (a) {
          const constrained = constrainAngle(a, screen);
          const snapped = fromXY(constrained.x, constrained.y);
          if (snapped) pt = snapped;
        }
      }

      if (isBrushKind(t)) return;

      const need = requiredPoints(t);
      if (need === 1) {
        if (t === "text" || t === "anchoredText" || t === "note" || t === "callout") {
          const txt = typeof window !== "undefined" ? window.prompt("Text") : null;
          if (txt && txt.trim()) finishDrawing(t, [pt], { text: txt.trim() });
          return;
        }
        if (t === "image") {
          const url = typeof window !== "undefined" ? window.prompt("Image URL") : null;
          if (url && url.trim()) finishDrawing(t, [pt], { text: "image", meta: { imageUrl: url.trim() } });
          return;
        }
        finishDrawing(t, [pt]);
        return;
      }

      if (!Number.isFinite(need) || need === Number.POSITIVE_INFINITY) {
        // Polyline / path: double-click finishes — single click appends.
        setPending((prev) => [...prev, pt]);
        return;
      }

      setPending((prev) => {
        const next = [...prev, pt];
        if (next.length >= need) {
          queueMicrotask(() => finishDrawing(t, next));
          return [];
        }
        return next;
      });
    },
    [pending.length, toXY, fromXY, finishDrawing],
  );

  const eraseAt = useCallback(
    (x: number, y: number) => {
      const w = wrapRef.current?.clientWidth ?? 0;
      const h = wrapRef.current?.clientHeight ?? 0;
      const hit = findTopHit(drawingsRef.current, x, y, toXY, w, h);
      if (!hit || hit.locked) return;
      commit(drawingsRef.current.filter((d) => d.id !== hit.id));
      setSelectedIds((ids) => ids.filter((id) => id !== hit.id));
    },
    [toXY, wrapRef, commit],
  );

  // Chart click for drawing / eraser / select.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;

    const onClick = (param: Parameters<Parameters<IChartApi["subscribeClick"]>[0]>[0]) => {
      const t = toolRef.current;
      const point = param.point;
      if (!point) return;

      if (t === "eraser") {
        eraseAt(point.x, point.y);
        return;
      }

      if (t === "cursor" || t === "crosshair" || t === "dot") {
        const w = wrapRef.current?.clientWidth ?? 0;
        const h = wrapRef.current?.clientHeight ?? 0;
        const hit = findTopHit(drawingsRef.current, point.x, point.y, toXY, w, h);
        if (hit) {
          setSelectedIds([hit.id]);
          setSettingsOpen(true);
        } else {
          setSelectedIds([]);
        }
        return;
      }

      if (!isDrawingKind(t) || isBrushKind(t)) return;
      const y = point.y;
      const price = series.coordinateToPrice(y);
      if (price == null || !Number.isFinite(price)) return;
      // Prefer time from param; fall back to coordinateToTime.
      let time: number | null = param.time != null ? Number(param.time) : null;
      if (time == null) {
        const ct = chart.timeScale().coordinateToTime(point.x);
        time = ct != null ? Number(ct) : null;
      }
      if (time == null) return;
      let pt: DrawPoint = { time, price };
      const magnetMode = altMagnetOffRef.current ? "off" : magnet;
      if (magnetMode !== "off") pt = magnetSnap(pt.time, pt.price, barsRef.current, magnetMode);
      placePoint(pt, { x: point.x, y: point.y });
    };

    chart.subscribeClick(onClick);
    return () => chart.unsubscribeClick(onClick);
  }, [chartRef, seriesRef, eraseAt, placePoint, toXY, wrapRef, magnet, barsRef, sizeTick]);

  // Hover preview.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    const onMove = (param: Parameters<Parameters<IChartApi["subscribeCrosshairMove"]>[0]>[0]) => {
      const t = toolRef.current;
      if (!isDrawingKind(t) || pending.length === 0 || isBrushKind(t)) {
        setHover(null);
        return;
      }
      if (!param.point || param.time == null) {
        setHover(null);
        return;
      }
      const price = series.coordinateToPrice(param.point.y);
      if (price == null || !Number.isFinite(price)) {
        setHover(null);
        return;
      }
      let pt: DrawPoint = { time: Number(param.time), price };
      const magnetMode = altMagnetOffRef.current ? "off" : magnet;
      if (magnetMode !== "off") pt = magnetSnap(pt.time, pt.price, barsRef.current, magnetMode);
      setHover({ x: param.point.x, y: param.point.y, ...pt });
    };
    chart.subscribeCrosshairMove(onMove);
    return () => chart.unsubscribeCrosshairMove(onMove);
  }, [chartRef, seriesRef, pending.length, magnet, barsRef]);

  // Crosshair mode from cursor tool.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions({
      crosshair: {
        mode:
          tool === "cursor"
            ? CrosshairMode.Hidden
            : tool === "dot"
              ? CrosshairMode.Magnet
              : CrosshairMode.Normal,
      },
    });
  }, [tool, chartRef]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (typing) return;

      const mod = e.ctrlKey || e.metaKey;
      if (e.key === "Escape") {
        setPending([]);
        setHover(null);
        setTool("cursor");
        setContextMenu(null);
        return;
      }
      if (e.key === "Alt") altMagnetOffRef.current = true;
      if (e.key === "Shift") shiftAngleRef.current = true;

      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length) {
        e.preventDefault();
        commit(drawingsRef.current.filter((d) => !selectedIds.includes(d.id) || d.locked));
        setSelectedIds([]);
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        const prev = historyRef.current.undo(drawingsRef.current);
        if (prev) {
          setDrawings(prev);
          persistRef.current.persist(symbol, timeframe, prev);
        }
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        const next = historyRef.current.redo(drawingsRef.current);
        if (next) {
          setDrawings(next);
          persistRef.current.persist(symbol, timeframe, next);
        }
        return;
      }
      if (mod && e.key.toLowerCase() === "c" && selectedIds.length) {
        e.preventDefault();
        setClipboard(
          drawingsRef.current.filter((d) => selectedIds.includes(d.id)).map((d) => ({ ...cloneDrawings([d])[0] })),
        );
        return;
      }
      if (mod && e.key.toLowerCase() === "v" && clipboard.length) {
        e.preventDefault();
        const now = Date.now();
        const pasted = clipboard.map((d) => ({
          ...cloneDrawings([d])[0],
          id: newDrawingId(d.kind),
          points: d.points.map((p) => ({ time: p.time, price: p.price })),
          createdAt: now,
          updatedAt: now,
        }));
        commit([...drawingsRef.current, ...pasted]);
        setSelectedIds(pasted.map((p) => p.id));
        return;
      }
      if (mod && e.key.toLowerCase() === "d" && selectedIds.length) {
        e.preventDefault();
        const now = Date.now();
        const dupes = drawingsRef.current
          .filter((d) => selectedIds.includes(d.id))
          .map((d) => ({
            ...cloneDrawings([d])[0],
            id: newDrawingId(d.kind),
            points: d.points.map((p) => ({ time: p.time + 60, price: p.price })),
            createdAt: now,
            updatedAt: now,
          }));
        commit([...drawingsRef.current, ...dupes]);
        setSelectedIds(dupes.map((p) => p.id));
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedIds(drawingsRef.current.map((d) => d.id));
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") altMagnetOffRef.current = false;
      if (e.key === "Shift") shiftAngleRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [selectedIds, clipboard, commit, symbol, timeframe]);

  const chooseTool = (next: DrawTool) => {
    setTool((prev) => (prev === next && next !== "cursor" ? "cursor" : next));
    setPending([]);
    setHover(null);
  };

  const updateSelected = (patch: Partial<Omit<Drawing, "style">> & { style?: Partial<DrawingStyle> }) => {
    if (!selectedIds.length) return;
    commit(
      drawingsRef.current.map((d) => {
        if (!selectedIds.includes(d.id) || d.locked) return d;
        return {
          ...d,
          ...patch,
          style: patch.style ? { ...d.style, ...patch.style, levels: patch.style.levels ?? d.style.levels } : d.style,
          updatedAt: Date.now(),
        };
      }),
    );
  };

  const removeSelected = () => {
    commit(drawingsRef.current.filter((d) => !selectedIds.includes(d.id) || d.locked));
    setSelectedIds([]);
  };

  const duplicateSelected = () => {
    const now = Date.now();
    const dupes = drawingsRef.current
      .filter((d) => selectedIds.includes(d.id))
      .map((d) => ({
        ...cloneDrawings([d])[0],
        id: newDrawingId(d.kind),
        points: d.points.map((p) => ({ time: p.time + 60, price: p.price })),
        createdAt: now,
        updatedAt: now,
      }));
    commit([...drawingsRef.current, ...dupes]);
    setSelectedIds(dupes.map((d) => d.id));
  };

  const clearAll = () => {
    commit([]);
    setSelectedIds([]);
    setPending([]);
  };

  const toggleLockAll = () => {
    setLockedAll((v) => {
      const next = !v;
      commit(drawingsRef.current.map((d) => ({ ...d, locked: next, updatedAt: Date.now() })));
      return next;
    });
  };

  const toggleHideAll = () => {
    setHiddenAll((v) => {
      const next = !v;
      commit(drawingsRef.current.map((d) => ({ ...d, visible: !next, updatedAt: Date.now() })));
      return next;
    });
  };

  const bringForward = () => {
    const id = selectedIds[0];
    if (!id) return;
    const list = cloneDrawings(drawingsRef.current).sort((a, b) => a.zIndex - b.zIndex);
    const idx = list.findIndex((d) => d.id === id);
    if (idx < 0 || idx >= list.length - 1) return;
    const z = list[idx].zIndex;
    list[idx].zIndex = list[idx + 1].zIndex;
    list[idx + 1].zIndex = z;
    commit(list);
  };

  const sendBackward = () => {
    const id = selectedIds[0];
    if (!id) return;
    const list = cloneDrawings(drawingsRef.current).sort((a, b) => a.zIndex - b.zIndex);
    const idx = list.findIndex((d) => d.id === id);
    if (idx <= 0) return;
    const z = list[idx].zIndex;
    list[idx].zIndex = list[idx - 1].zIndex;
    list[idx - 1].zIndex = z;
    commit(list);
  };

  const saveTemplate = () => {
    const d = drawingsRef.current.find((x) => selectedIds.includes(x.id));
    if (!d) return;
    const name = typeof window !== "undefined" ? window.prompt("Template name", `${d.kind} template`) : null;
    if (!name?.trim()) return;
    const now = Date.now();
    const tpl: DrawingTemplate = {
      id: newDrawingId("tpl"),
      name: name.trim(),
      kind: d.kind,
      style: { ...d.style, levels: d.style.levels.map((l) => ({ ...l })) },
      createdAt: now,
      updatedAt: now,
    };
    const next = [...templates, tpl];
    setTemplates(next);
    saveTemplates(next);
    styleDraftRef.current = createDefaultStyle(tpl.style);
  };

  // Pointer handlers for brush + drag edit (attached by DrawingLayer).
  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const t = toolRef.current;

    if (e.button === 2) {
      const w = rect.width;
      const h = rect.height;
      const hit = findTopHit(drawingsRef.current, x, y, toXY, w, h);
      if (hit) {
        setSelectedIds([hit.id]);
        setContextMenu({ x: e.clientX - (wrapRef.current?.getBoundingClientRect().left ?? 0), y: e.clientY - (wrapRef.current?.getBoundingClientRect().top ?? 0), id: hit.id });
      }
      return;
    }

    if (isBrushKind(t)) {
      const pt = fromXY(x, y);
      if (!pt) return;
      brushPathRef.current = [pt];
      svg.setPointerCapture(e.pointerId);
      return;
    }

    if (t !== "cursor" && t !== "crosshair" && t !== "dot") return;

    const w = rect.width;
    const h = rect.height;
    const hit = findTopHit(drawingsRef.current, x, y, toXY, w, h);
    if (!hit || hit.locked) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds([hit.id]);
    setSettingsOpen(true);
    const handleIndex = hitTestHandle(hit, x, y, toXY);
    const start = fromXY(x, y);
    if (!start) return;
    dragRef.current = {
      mode: handleIndex >= 0 ? "handle" : "move",
      id: hit.id,
      handleIndex,
      start,
      origin: cloneDrawings([hit])[0],
    };
    historyRef.current.push(drawingsRef.current);
    svg.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const t = toolRef.current;

    if (isBrushKind(t) && brushPathRef.current.length) {
      const pt = fromXY(x, y);
      if (pt) brushPathRef.current = [...brushPathRef.current, pt];
      setHover({ x, y, ...(pt ?? { time: 0, price: 0 }) });
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    const cur = fromXY(x, y);
    if (!cur) return;
    const dt = cur.time - drag.start.time;
    const dp = cur.price - drag.start.price;
    setDrawings((prev) =>
      prev.map((d) => {
        if (d.id !== drag.id) return d;
        if (drag.mode === "handle" && drag.handleIndex >= 0) {
          const points = d.points.map((p, i) => (i === drag.handleIndex ? { ...cur } : p));
          return { ...d, points, updatedAt: Date.now() };
        }
        return {
          ...d,
          points: drag.origin.points.map((p) => ({ time: p.time + dt, price: p.price + dp })),
          path: drag.origin.path?.map((p) => ({ time: p.time + dt, price: p.price + dp })),
          updatedAt: Date.now(),
        };
      }),
    );
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const t = toolRef.current;
    if (isBrushKind(t) && brushPathRef.current.length >= 2) {
      const path = brushPathRef.current;
      brushPathRef.current = [];
      finishDrawing(t as DrawingKind, [path[0], path[path.length - 1]], { path });
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      return;
    }
    if (dragRef.current) {
      persistRef.current.persist(symbol, timeframe, drawingsRef.current);
      dragRef.current = null;
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const selected = drawings.find((d) => d.id === selectedIds[0]) ?? null;
  void digits;

  return {
    tool,
    chooseTool,
    drawings,
    pending,
    hover,
    selectedIds,
    selected,
    magnet,
    setMagnet,
    stayInDrawing,
    setStayInDrawing,
    lockedAll,
    toggleLockAll,
    hiddenAll,
    toggleHideAll,
    collapsed,
    setCollapsed,
    clearAll,
    toXY,
    updateSelected,
    removeSelected,
    duplicateSelected,
    bringForward,
    sendBackward,
    saveTemplate,
    templates,
    settingsOpen,
    setSettingsOpen,
    contextMenu,
    setContextMenu,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    finishPolyline: () => {
      const t = toolRef.current;
      if (isDrawingKind(t) && pending.length >= 2) finishDrawing(t, pending);
      setPending([]);
    },
  };
}

export type DrawingEngineApi = ReturnType<typeof useDrawingEngine>;
