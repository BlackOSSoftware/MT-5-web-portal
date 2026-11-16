import axios from "axios";
import { forcePortalLogoutToLogin, isAppLockedError } from "@/lib/appLock";
import { normalizeApiBaseUrl } from "./baseUrl";

const api = axios.create({
  baseURL: normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data;
    if (isAppLockedError(data)) {
      forcePortalLogoutToLogin();
    }
    return Promise.reject(error);
  }
);

export default api;
