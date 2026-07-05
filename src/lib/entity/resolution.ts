// Stable entity resolution — external identifiers preferred over slugified names.

import { entityId } from "@/lib/graph";

export interface ResolvedEntity {
  id: string;
  canonicalName: string;
  objectType: string;
  resolutionMethod: "external_id" | "heuristic" | "wikidata";
  confidence: number;
  identifiers: { type: string; value: string }[];
}

const TICKER = /^[\^]?[A-Z]{1,5}$/;
const ICAO = /^[A-Z]{4}$/;
const IATA = /^[A-Z]{3}$/;
const MMSI = /^\d{9}$/;
const IMO = /^IMO\s?\d{7}$/i;

const KNOWN_TICKERS = new Set(["AAPL", "MSFT", "NVDA", "GOOG", "GOOGL", "AMZN", "TSLA", "META", "NFLX", "INTC", "AMD", "IBM"]);

export function resolveFromQuery(q: string): Partial<ResolvedEntity> | null {
  const trimmed = q.trim();
  const upper = trimmed.toUpperCase();

  if (trimmed.startsWith("^") && TICKER.test(trimmed.slice(1))) {
    const sym = trimmed.slice(1).toUpperCase();
    return {
      id: `instrument:${sym.toLowerCase()}`,
      canonicalName: sym,
      objectType: "instrument",
      resolutionMethod: "external_id",
      confidence: 0.95,
      identifiers: [{ type: "ticker", value: sym }],
    };
  }

  if (TICKER.test(upper) && (upper.length !== 4 || KNOWN_TICKERS.has(upper))) {
    return {
      id: `instrument:${upper.replace(/^\^/, "").toLowerCase()}`,
      canonicalName: upper,
      objectType: "instrument",
      resolutionMethod: "external_id",
      confidence: KNOWN_TICKERS.has(upper) ? 0.95 : 0.85,
      identifiers: [{ type: "ticker", value: upper }],
    };
  }

  if (ICAO.test(upper)) {
    return {
      id: `airport:${upper.toLowerCase()}`,
      canonicalName: upper,
      objectType: "airport",
      resolutionMethod: "external_id",
      confidence: 0.95,
      identifiers: [{ type: "icao", value: upper }],
    };
  }
  if (IATA.test(upper)) {
    return {
      id: `airport:iata:${upper.toLowerCase()}`,
      canonicalName: upper,
      objectType: "airport",
      resolutionMethod: "external_id",
      confidence: 0.85,
      identifiers: [{ type: "iata", value: upper }],
    };
  }
  if (MMSI.test(trimmed)) {
    return {
      id: `vessel:mmsi:${trimmed}`,
      canonicalName: `MMSI ${trimmed}`,
      objectType: "vessel",
      resolutionMethod: "external_id",
      confidence: 0.95,
      identifiers: [{ type: "mmsi", value: trimmed }],
    };
  }
  const imoMatch = trimmed.match(IMO);
  if (imoMatch) {
    const num = trimmed.replace(/\D/g, "");
    return {
      id: `vessel:imo:${num}`,
      canonicalName: `IMO ${num}`,
      objectType: "vessel",
      resolutionMethod: "external_id",
      confidence: 0.95,
      identifiers: [{ type: "imo", value: num }],
    };
  }
  return null;
}

export function resolveFromItemEntity(name: string, type: string): ResolvedEntity {
  return {
    id: entityId(name, type),
    canonicalName: name,
    objectType: type,
    resolutionMethod: "heuristic",
    confidence: 0.5,
    identifiers: [],
  };
}
