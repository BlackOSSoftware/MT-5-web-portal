"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSymbolProperty } from "@/services/property.service";

export const useSymbolProperty = (symbol: string) => {
  return useQuery({
    queryKey: ["symbol-property", symbol],
    queryFn: () => fetchSymbolProperty(symbol),
    enabled: !!symbol,
    staleTime: 1000 * 60 * 5,
  });
};
