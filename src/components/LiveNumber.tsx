"use client";

import { useEffect, useRef, useState } from "react";

/** Live stat with tabular nums + one-shot count-bump only when value actually changes. */
export function LiveNumber({
  value,
  className = "",
}: {
  value: number | string;
  className?: string;
}) {
  const prev = useRef(value);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setBump(true);
      const t = setTimeout(() => setBump(false), 400);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span className={`live-num mono ${bump ? "count-bump" : ""} ${className}`.trim()}>
      {typeof value === "number" ? value.toLocaleString() : value}
    </span>
  );
}
