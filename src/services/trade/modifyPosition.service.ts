import tradeApi from "@/api/tradeApi";

export const modifyPosition = async (data: {
  positionId: string;
  /** number = set, null = remove the level, omitted = unchanged */
  stopLoss?: number | null;
  takeProfit?: number | null;
}) => {
  const res = await tradeApi.patch(
    "/trade/position/modify",
    data
  );
  return res.data;
};
