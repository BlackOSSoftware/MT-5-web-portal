"use client";

import { useEffect } from "react";

export default function ChunkErrorBoundary() {
  useEffect(() => {
    let reloaded = false;

    try {
      reloaded = sessionStorage.getItem("chunkReloaded") === "true";
    } catch {}

    const handleError = (event: ErrorEvent) => {
      const msg = event?.message || "";

      if (
        msg.includes("Failed to load chunk") ||
        msg.includes("Cannot read properties of null")
      ) {
        if (!reloaded) {
          try {
            sessionStorage.setItem("chunkReloaded", "true");
          } catch {}

          setTimeout(() => {
            window.location.reload(); // ✅ no argument
          }, 200);
        } else {
          console.error("Chunk failed even after reload.");
        }
      }
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  return null;
}
