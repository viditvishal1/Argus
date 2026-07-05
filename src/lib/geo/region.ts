/** Rough India bounding box (includes mainland + Andaman margin). */
export function isInIndia(lat: number, lon: number): boolean {
  return lat >= 6 && lat <= 37.5 && lon >= 68 && lon <= 97.5;
}

export function pickTrafficRegion(lat: number, lon: number): "india" | "global" {
  return isInIndia(lat, lon) ? "india" : "global";
}
