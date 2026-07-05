// TomTom traffic provider abstraction — optional, key-gated.

import { fetchWithTimeout } from "@/lib/connectors/framework";

export interface TrafficFlowSegment {
  id: string;
  lat: number;
  lon: number;
  currentSpeed: number;
  freeFlowSpeed: number;
  confidence: number;
}

export function trafficEnabled(): boolean {
  return Boolean(process.env.TOMTOM_API_KEY);
}

export async function fetchTrafficFlow(bbox: { minLat: number; minLon: number; maxLat: number; maxLon: number }): Promise<TrafficFlowSegment[]> {
  const key = process.env.TOMTOM_API_KEY;
  if (!key) return [];

  const { minLat, minLon, maxLat, maxLon } = bbox;
  const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${key}&point=${(minLat + maxLat) / 2},${(minLon + maxLon) / 2}`;

  const res = await fetchWithTimeout(url, { timeoutMs: 10000 });
  if (!res.ok) return [];
  const data = await res.json();
  const seg = data.flowSegmentData;
  if (!seg?.coordinates?.coordinate) return [];

  const coords = seg.coordinates.coordinate as { latitude: number; longitude: number }[];
  const mid = coords[Math.floor(coords.length / 2)] ?? coords[0];
  return [{
    id: "tomtom:flow:0",
    lat: mid.latitude,
    lon: mid.longitude,
    currentSpeed: seg.currentSpeed ?? 0,
    freeFlowSpeed: seg.freeFlowSpeed ?? 0,
    confidence: seg.confidence ?? 0.5,
  }];
}
