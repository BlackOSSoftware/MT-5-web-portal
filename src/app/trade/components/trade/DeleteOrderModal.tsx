"use client";

import { Toast } from "@/app/components/ui/Toast";
import { useCancelPendingOrder } from "@/hooks/useCancelPendingOrder";
import { removeLivePendingFromCache } from "@/hooks/useLiveTradeSocket";
import { useOneClickTrading } from "@/lib/oneClickTrading";
import { useEffect, useRef, useState } from "react";

type DeleteOrderModalProps = {
    order: any;
    open: boolean;
    onClose: () => void;
};

export default function DeleteOrderModal({
    order,
    open,
    onClose,
}: DeleteOrderModalProps) {
    
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const { mutate, isPending } = useCancelPendingOrder();
    const [oneClick] = useOneClickTrading();
    const deleteRef = useRef<() => void>(() => {});
    const autoFiredRef = useRef(false);
    const orderTypeLabel = String(order?.orderType ?? "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    useEffect(() => {
        autoFiredRef.current = false;
    }, [open, order?.orderId]);

    const handleDelete = () => {
        if (!order) return;
        mutate(order.orderId, {
            onSuccess: (res: any) => {
                removeLivePendingFromCache(String(order.orderId ?? ""));
                setToast({
                    type: "success",
                    message: res?.message || "Order deleted successfully",
                });

                setTimeout(() => {
                    onClose();
                }, 1200);
            },
            onError: (err: any) => {
                setToast({
                    type: "error",
                    message: err?.message || "Delete failed",
                });
            },
        });
    };
    deleteRef.current = handleDelete;

    // One-click trading: deleting an order skips this confirmation entirely.
    useEffect(() => {
        if (!open || !oneClick || autoFiredRef.current || !order) return;
        autoFiredRef.current = true;
        deleteRef.current();
    }, [open, oneClick, order]);

    if (!open || !order) return null;

    // One-click trading: the delete already fired — show only the toast, no modal box.
    if (oneClick) {
        return toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null;
    }

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">

            <div className="w-[90%] max-w-md rounded-2xl bg-[var(--mt-grey)] p-6 text-[var(--text-main)] shadow-xl">

                <div className="text-xl font-semibold mb-4">
                    Delete order
                </div>

                <div className="text-sm mb-6">
                    Delete order: #{order.orderId.slice(0, 10)}{" "}
                    {order.side?.toLowerCase()}{" "}
                    {orderTypeLabel} <br />
                    {order.volume} {order.symbol} at {order.price}?
                </div>

                <div className="flex justify-end gap-6 text-[var(--mt-blue)] font-semibold">

                    <button onClick={onClose}>
                        Cancel
                    </button>

                    <button
                        disabled={isPending}
                        onClick={handleDelete}
                    >
                        {isPending ? "Deleting..." : "Delete"}
                    </button>

                </div>

            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
        

    );
}
