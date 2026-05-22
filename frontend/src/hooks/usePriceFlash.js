import { useEffect, useRef, useState } from 'react';

/**
 * Compares each new price tick to the previous value and returns a short-lived
 * flash direction for table cells (green up / red down).
 */
export function usePriceFlash(price) {
  const [flash, setFlash] = useState(null);
  const previousRef = useRef(undefined);

  useEffect(() => {
    const prev = previousRef.current;
    const next = price == null ? null : Number(price);

    if (prev != null && next != null && !Number.isNaN(next) && prev !== next) {
      setFlash(next > prev ? 'up' : 'down');
      const timer = setTimeout(() => setFlash(null), 500);
      previousRef.current = next;
      return () => clearTimeout(timer);
    }

    if (next != null && !Number.isNaN(next)) {
      previousRef.current = next;
    }
  }, [price]);

  return flash;
}
