"use client";

import { useEffect } from "react";

/** Pause decorative animations when the tab is hidden (World Monitor motion rule). */
export function MotionPause() {
  useEffect(() => {
    const sync = () => {
      document.body.classList.toggle("animations-paused", document.hidden);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return null;
}
