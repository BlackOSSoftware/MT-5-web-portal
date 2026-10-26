import { normalizeApiBaseUrl } from "@/api/baseUrl";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function removeApiSuffix(pathname: string): string {
  return pathname.replace(/\/api(?:\/v1)?\/?$/i, "");
}

function resolveWebSocketProtocol(
  protocol: string,
  pageProtocol?: string
): "ws:" | "wss:" {
  // Never downgrade an explicit secure socket/API URL (e.g. localhost http → live wss).
  if (protocol === "https:" || protocol === "wss:") return "wss:";
  // Upgrade when the page itself is HTTPS (mixed-content safe).
  if (pageProtocol === "https:") return "wss:";
  return "ws:";
}

function parseUrlOrNull(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function buildSocketBaseFromApiUrl(apiUrl: string): string | null {
  const parsed = parseUrlOrNull(apiUrl);
  if (!parsed) return null;
  const pageProtocol =
    typeof window !== "undefined" ? window.location.protocol : undefined;
  parsed.protocol = resolveWebSocketProtocol(parsed.protocol, pageProtocol);
  parsed.pathname = `${removeApiSuffix(parsed.pathname)}/ws`;
  parsed.search = "";
  parsed.hash = "";
  return trimTrailingSlash(parsed.toString());
}

export function getSocketBaseUrl(): string {
  const pageProtocol =
    typeof window !== "undefined" ? window.location.protocol : undefined;

  const rawSocketBase = (process.env.NEXT_PUBLIC_SOKETAPIBASE_URL ?? "").trim();
  if (rawSocketBase) {
    const parsedSocket = parseUrlOrNull(rawSocketBase);
    if (parsedSocket) {
      parsedSocket.protocol = resolveWebSocketProtocol(
        parsedSocket.protocol,
        pageProtocol
      );
      // Normalize .../ws/ or .../ws/market → .../ws
      parsedSocket.pathname = removeApiSuffix(
        parsedSocket.pathname.replace(/\/market\/?$/i, "")
      );
      if (!/\/ws$/i.test(parsedSocket.pathname.replace(/\/+$/, ""))) {
        parsedSocket.pathname = `${parsedSocket.pathname.replace(/\/+$/, "")}/ws`;
      }
      parsedSocket.pathname = parsedSocket.pathname.replace(/\/+$/, "") || "/ws";
      parsedSocket.search = "";
      parsedSocket.hash = "";
      return trimTrailingSlash(parsedSocket.toString());
    }
    return trimTrailingSlash(rawSocketBase);
  }

  const normalizedApiBase = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
  const fromApi = buildSocketBaseFromApiUrl(normalizedApiBase);
  if (fromApi) return fromApi;

  if (typeof window !== "undefined") {
    const protocol = resolveWebSocketProtocol("http:", pageProtocol);
    return `${protocol}//${window.location.host}/ws`;
  }

  return "";
}

export function buildSocketUrl(pathname: string): string {
  const base = getSocketBaseUrl();
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${normalizedPath}`;
}
