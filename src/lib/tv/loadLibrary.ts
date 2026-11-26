/**
 * Loads the licensed TradingView Charting Library from `/charting_library`.
 * Place your partner package under `public/charting_library/` (see README there).
 */

declare global {
  interface Window {
    TradingView?: {
      widget: new (options: Record<string, unknown>) => TvWidget;
    };
  }
}

export type TvWidget = {
  onChartReady: (cb: () => void) => void;
  remove: () => void;
  activeChart: () => TvChart;
  headerReady?: () => Promise<void>;
};

export type TvChart = {
  symbol: () => string;
  resolution: () => string;
  setSymbol: (symbol: string, callback?: () => void) => void;
  createShape: (
    point: { time?: number; price?: number },
    options: Record<string, unknown>,
  ) => Promise<string> | string;
  removeEntity: (id: string) => void;
  getAllShapes?: () => { id: string }[];
};

const SCRIPT_CANDIDATES = [
  "/charting_library/charting_library.standalone.js",
  "/charting_library/charting_library.js",
  "/charting_library/charting_library.esm.js",
];

let loadPromise: Promise<boolean> | null = null;

async function urlExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (res.ok) return true;
    // Some static hosts reject HEAD — try GET range
    if (res.status === 405 || res.status === 501) {
      const g = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        cache: "no-store",
      });
      return g.ok || g.status === 206;
    }
    return false;
  } catch {
    return false;
  }
}

export async function chartingLibraryPresent(): Promise<boolean> {
  for (const src of SCRIPT_CANDIDATES) {
    if (await urlExists(src)) return true;
  }
  // Bundle folder marker
  if (await urlExists("/charting_library/package.json")) return true;
  if (await urlExists("/charting_library/datafeed-api.d.ts")) return true;
  return false;
}

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-tv-cl="${src}"]`);
    if (existing) {
      if (window.TradingView?.widget) resolve();
      else existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.tvCl = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/** Returns true when `window.TradingView.widget` is available. */
export function loadChartingLibrary(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.TradingView?.widget) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    for (const src of SCRIPT_CANDIDATES) {
      if (!(await urlExists(src))) continue;
      try {
        await injectScript(src);
        if (window.TradingView?.widget) return true;
      } catch {
        /* try next */
      }
    }
    return Boolean(window.TradingView?.widget);
  })().finally(() => {
    /* keep resolved promise for reuse */
  });

  return loadPromise;
}
