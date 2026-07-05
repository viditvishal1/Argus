"use client";

import { useCallback, useEffect, useRef } from "react";

export interface SmartPollOptions {
  /** Base interval when tab visible (ms). */
  intervalMs: number;
  /** Multiplier applied per consecutive hidden-tab skip (capped). */
  hiddenBackoff?: number;
  /** Max interval when hidden (ms). */
  maxHiddenIntervalMs?: number;
  /** Run immediately on mount. */
  immediate?: boolean;
}

/**
 * Viewport-aware polling with tab-visibility backoff (G30).
 */
export function useSmartPoll(fn: () => void | Promise<void>, options: SmartPollOptions) {
  const {
    intervalMs,
    hiddenBackoff = 2,
    maxHiddenIntervalMs = 300_000,
    immediate = true,
  } = options;

  const fnRef = useRef(fn);
  const hiddenSkips = useRef(0);
  fnRef.current = fn;

  const tick = useCallback(() => {
    void fnRef.current();
  }, []);

  useEffect(() => {
    if (immediate) tick();

    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const hidden = typeof document !== "undefined" && document.hidden;
      const delay = hidden
        ? Math.min(intervalMs * hiddenBackoff ** hiddenSkips.current, maxHiddenIntervalMs)
        : intervalMs;
      if (hidden) hiddenSkips.current += 1;
      else hiddenSkips.current = 0;
      timer = setTimeout(() => {
        if (!hidden || hiddenSkips.current <= 3) tick();
        schedule();
      }, delay);
    };

    const onVis = () => {
      if (!document.hidden) {
        hiddenSkips.current = 0;
        tick();
      }
    };

    schedule();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intervalMs, hiddenBackoff, maxHiddenIntervalMs, immediate, tick]);
}
