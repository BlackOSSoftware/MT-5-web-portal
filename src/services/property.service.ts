import tradeApi from "@/api/tradeApi";

export const fetchSymbolProperty = async (symbol: string) => {
  const { data } = await tradeApi.get(`/property/${symbol}`);
  return data;
};
