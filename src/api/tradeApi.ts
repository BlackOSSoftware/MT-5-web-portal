import axios from "axios";
import { clearTradeTokenCookie, getTradeTokenFromStorageSync } from "@/lib/tradeToken";
import { normalizeApiBaseUrl } from "./baseUrl";
import { isTradeExiting } from "@/lib/tradeSession";

const tradeApi = axios.create({
  baseURL: normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

tradeApi.interceptors.request.use(
  (config) => {
    if (typeof document !== "undefined") {
      const token = getTradeTokenFromStorageSync();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

tradeApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      clearTradeTokenCookie({ silent: true });
      const path = window.location.pathname || "";
      // Re-open via the portal login; /trade-open guards against redirect loops.
      // Skip while the user is deliberately exiting, or we'd pull them back into the panel.
      if (!path.startsWith("/trade-open") && !isTradeExiting()) {
        window.location.replace("/trade-open");
      }
    }

    return Promise.reject(
      error.response?.data || { message: "Server Error" }
    );
  }
);

export default tradeApi;
