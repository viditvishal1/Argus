import type { VariantDefinition, VariantId } from "@/lib/variants/types";

const WORLD_PANELS = [
  "globe-map", "event-timeline", "wire-headlines", "conflict-events", "live-news",
  "markets-snapshot", "stocks-ticker", "aviation-status", "maritime-status", "space-tracker",
  "cyber-threats", "defcon-posture", "outbreaks-monitor", "watch-signals",
  "cameras", "my-monitors", "provider-health",
];

const WORLD_LAYERS = [
  "flights", "events", "quakes", "iss", "ships", "cctv", "satellites", "conflict",
];

const WORLD_MODULES = [
  "earth", "dashboard", "news", "conflict", "live", "cyber", "aviation",
  "maritime", "space", "graph", "investigations", "analyst",
];

export const VARIANT_REGISTRY: VariantDefinition[] = [
  {
    id: "world",
    label: "World",
    description: "Geopolitical OSINT — crisis monitoring, live map, conflict and convergence intelligence",
    panels: WORLD_PANELS,
    mapLayers: WORLD_LAYERS,
    modules: WORLD_MODULES,
    themeAccent: "sky",
    defaultPath: "/",
    enabled: true,
  },
  {
    id: "finance",
    label: "Finance",
    description: "Markets, macro, regime signals",
    panels: ["markets-snapshot", "stocks-ticker", "wire-headlines", "my-monitors", "macro-snapshot"],
    mapLayers: [],
    modules: ["markets", "macro", "dashboard", "analyst"],
    themeAccent: "emerald",
    defaultPath: "/markets",
    enabled: true,
  },
  {
    id: "tech",
    label: "Tech",
    description: "Startup and cyber intelligence",
    panels: ["wire-headlines", "cyber-threats", "watch-signals", "my-monitors"],
    mapLayers: [],
    modules: ["startup", "cyber", "dashboard", "analyst", "graph"],
    themeAccent: "violet",
    defaultPath: "/startup",
    enabled: true,
  },
  {
    id: "commodity",
    label: "Commodity",
    description: "Energy and supply-chain commodities",
    panels: ["markets-snapshot", "maritime-status", "globe-map"],
    mapLayers: ["ships"],
    modules: ["maritime", "macro", "markets", "dashboard"],
    themeAccent: "amber",
    defaultPath: "/maritime",
    enabled: true,
  },
  {
    id: "energy",
    label: "Energy",
    description: "Oil, gas and infrastructure",
    panels: ["markets-snapshot", "globe-map", "infrastructure-health", "maritime-status"],
    mapLayers: ["ships", "events"],
    modules: ["macro", "infrastructure", "maritime", "dashboard"],
    themeAccent: "orange",
    defaultPath: "/macro",
    enabled: true,
  },
  {
    id: "happy",
    label: "Happy",
    description: "Positive global signals",
    panels: ["wire-headlines", "live-news"],
    mapLayers: [],
    modules: ["news", "live", "dashboard"],
    themeAccent: "pink",
    defaultPath: "/news",
    enabled: true,
  },
];

const byId = new Map(VARIANT_REGISTRY.map((v) => [v.id, v]));

export function getVariant(id: string): VariantDefinition {
  return byId.get(id as VariantId) ?? byId.get("world")!;
}

export function listVariants(enabledOnly = false): VariantDefinition[] {
  return enabledOnly ? VARIANT_REGISTRY.filter((v) => v.enabled) : [...VARIANT_REGISTRY];
}

export const DEFAULT_VARIANT_ID: VariantId = "world";
