import tradeApi from "@/api/tradeApi";

export type ModifyPendingPayload = {
  orderId: string;
  price: number;
  /** number = set, null = remove the level */
  stopLoss: number | null;
  takeProfit: number | null;
};

export const modifyPendingOrder = async (
  payload: ModifyPendingPayload
) => {
  const res = await tradeApi.patch(
    "/trade/pending/modify",
    payload
  );
  return res.data;
};
