import { useRef } from "react";

export function useLongPress(callback: () => void, ms = 500) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const start = () => {
    timerRef.current = setTimeout(() => {
      callback();
    }, ms);
  };

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
  };
}
