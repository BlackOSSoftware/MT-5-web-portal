import tradeApi from "@/api/tradeApi";

export type ClosePositionPayload = {
  positionId: string;
};

export type ClosePositionResponse = {
  status: string;
  data: {
    positionId: string;
    realizedPnL: number;
  };
};

export const closePositionService = async (
  payload: ClosePositionPayload
): Promise<ClosePositionResponse> => {
  const { data } = await tradeApi.post(
    "/trade/position/close",
    payload
  );

  return data;
};
