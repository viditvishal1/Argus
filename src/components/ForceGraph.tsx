"use client";

// Force-directed graph renderer for the Knowledge Graph explorer — a small
// canvas simulation (repulsion + spring + centering) so we don't ship a 3D
// engine for a 2D view. Click a node to re-center the exploration on it.

import { useEffect, useRef } from "react";
import type { GraphEdge, GraphEntity } from "@/lib/types";

const TYPE_COLORS: Record<string, string> = {
  organization: "#7dd3fc", person: "#fda4af", location: "#fdba74",
  event: "#fcd34d", technology: "#f87171", repository: "#6ee7b7",
  vessel: "#67e8f9", aircraft: "#93c5fd", satellite: "#c4b5fd",
  instrument: "#86efac",
};

interface Node extends GraphEntity {
  x: number; y: number; vx: number; vy: number; r: number;
}

export function ForceGraph({
  entities, edges, onSelect, height = 520,
}: {
  entities: GraphEntity[];
  edges: GraphEdge[];
  onSelect?: (id: string) => void;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const nodes: Node[] = entities.map((e, i) => ({
      ...e,
      x: W / 2 + Math.cos((i / entities.length) * Math.PI * 2) * Math.min(W, H) * 0.35,
      y: H / 2 + Math.sin((i / entities.length) * Math.PI * 2) * Math.min(W, H) * 0.35,
      vx: 0, vy: 0,
      r: Math.min(16, 3 + Math.sqrt(e.degree) * 1.6),
    }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const links = edges
      .map((e) => ({ a: byId.get(e.source), b: byId.get(e.target), w: e.weight }))
      .filter((l): l is { a: Node; b: Node; w: number } => Boolean(l.a && l.b));

    let hover: Node | null = null;
    let raf = 0;
    let ticks = 0;

    const step = () => {
      // Repulsion (O(n²) is fine at the 120-node cap).
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) { dx = Math.random(); dy = Math.random(); d2 = 1; }
          const f = 900 / d2;
          const d = Math.sqrt(d2);
          a.vx += (dx / d) * f; a.vy += (dy / d) * f;
          b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
        }
      }
      for (const l of links) {
        const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const f = (d - 70) * 0.004 * Math.min(3, l.w);
        l.a.vx += (dx / d) * f; l.a.vy += (dy / d) * f;
        l.b.vx -= (dx / d) * f; l.b.vy -= (dy / d) * f;
      }
      for (const n of nodes) {
        n.vx += (W / 2 - n.x) * 0.002;
        n.vy += (H / 2 - n.y) * 0.002;
        n.vx *= 0.85; n.vy *= 0.85;
        n.x = Math.max(n.r, Math.min(W - n.r, n.x + n.vx));
        n.y = Math.max(n.r, Math.min(H - n.r, n.y + n.vy));
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(139,152,165,0.18)";
      for (const l of links) {
        ctx.lineWidth = Math.min(2.5, 0.5 + l.w * 0.3);
        ctx.beginPath();
        ctx.moveTo(l.a.x, l.a.y);
        ctx.lineTo(l.b.x, l.b.y);
        ctx.stroke();
      }
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = TYPE_COLORS[n.type] ?? "#8b98a5";
        ctx.globalAlpha = hover && hover !== n ? 0.55 : 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
        if (n.r > 6 || n === hover) {
          ctx.fillStyle = n === hover ? "#e6edf3" : "#8b98a5";
          ctx.font = "10px ui-monospace, monospace";
          ctx.fillText(n.name.slice(0, 26), n.x + n.r + 3, n.y + 3);
        }
      }
    };

    const loop = () => {
      if (ticks < 300) { step(); ticks++; }
      draw();
      raf = requestAnimationFrame(loop);
    };
    loop();

    const pick = (mx: number, my: number) =>
      nodes.find((n) => Math.hypot(n.x - mx, n.y - my) <= n.r + 3) ?? null;

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      hover = pick(e.clientX - rect.left, e.clientY - rect.top);
      canvas.style.cursor = hover ? "pointer" : "default";
    };
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const n = pick(e.clientX - rect.left, e.clientY - rect.top);
      if (n) onSelectRef.current?.(n.id);
    };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
    };
  }, [entities, edges, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height }}
      className="rounded-lg border border-line bg-panel"
      role="img"
      aria-label="Knowledge graph visualization"
    />
  );
}
