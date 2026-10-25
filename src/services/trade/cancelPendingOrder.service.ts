import tradeApi from "@/api/tradeApi";

export const cancelPendingOrder = async (orderId: string) => {
  const { data } = await tradeApi.post(
    "/trade/pending/cancel",
    {
      orderId,
    }
  );

  return data;
};
