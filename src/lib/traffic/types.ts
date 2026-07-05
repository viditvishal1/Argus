export type TrafficProvider = "TomTom" | "Mappls";

export interface TrafficFlowSegment {
  id: string;
  provider: TrafficProvider;
  roadName?: string;
  lat: number;
  lon: number;
  currentSpeed: number;
  freeFlowSpeed: number;
  confidence: number;
  coords: [number, number][]; // [lon, lat]
}

export interface TrafficBbox {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}
