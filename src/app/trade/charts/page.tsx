"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import ChartContent from "../components/chart/ChartContent";

export default function Chart() {
  return (
    <Suspense fallback={null}>
      <ChartContent />
    </Suspense>
  );
}
