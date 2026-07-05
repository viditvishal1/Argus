// Viewport map utilities — server-side clustering and bbox filtering.

export interface MapPoint {
  id: string;
  lat: number;
  lon: number;
  label?: string;
  module?: string;
  heading?: number;
  extra?: Record<string, unknown>;
}

export interface ViewportQuery {
  west: number;
  south: number;
  east: number;
  north: number;
  zoom: number;
  limit?: number;
}

export function parseViewport(params: URLSearchParams): ViewportQuery | null {
  const west = Number(params.get("west"));
  const south = Number(params.get("south"));
  const east = Number(params.get("east"));
  const north = Number(params.get("north"));
  const zoom = Number(params.get("zoom") ?? 10);
  if ([west, south, east, north].some((n) => Number.isNaN(n))) return null;
  return { west, south, east, north, zoom, limit: Number(params.get("limit") ?? 500) };
}

export function inViewport(p: MapPoint, v: ViewportQuery): boolean {
  return p.lon >= v.west && p.lon <= v.east && p.lat >= v.south && p.lat <= v.north;
}

/** Simple grid clustering for dense point sets. */
export function clusterPoints(points: MapPoint[], zoom: number): MapPoint[] {
  if (zoom >= 10 || points.length <= 200) return points.slice(0, 500);
  const cell = Math.max(0.5, 8 / zoom);
  const buckets = new Map<string, MapPoint & { count: number }>();
  for (const p of points) {
    const key = `${Math.floor(p.lat / cell)}:${Math.floor(p.lon / cell)}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      existing.extra = { ...existing.extra, clusterCount: existing.count };
    } else {
      buckets.set(key, { ...p, count: 1, extra: { ...p.extra, cluster: true, clusterCount: 1 } });
    }
  }
  return [...buckets.values()].slice(0, 300);
}

export function filterByViewport(points: MapPoint[], v: ViewportQuery): MapPoint[] {
  return clusterPoints(points.filter((p) => inViewport(p, v)), v.zoom).slice(0, v.limit ?? 500);
}
