import { Suspense } from "react";
import NewOrderPage from "./NewOrderContent";

export default function NewOrder() {
    return(
        <>
            <Suspense fallback={null}>
                <NewOrderPage />
            </Suspense>
        </>
    )
}