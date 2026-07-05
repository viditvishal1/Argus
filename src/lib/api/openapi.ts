/** OpenAPI 3.1 subset for canonical /api/v1 (G31/G32). */

export const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "Argus API",
    version: "1.0.0",
    description: "Canonical read-mostly intelligence API. Legacy /api routes are deprecated.",
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/variants": { get: { summary: "Product variants", operationId: "listVariants" } },
    "/freshness": { get: { summary: "Source freshness snapshot", operationId: "getFreshness" } },
    "/findings": { get: { summary: "Cross-domain findings", operationId: "listFindings" } },
    "/country/{iso2}": {
      get: { summary: "Country brief", operationId: "getCountryBrief", parameters: [{ name: "iso2", in: "path", required: true, schema: { type: "string" } }] },
    },
    "/country/{iso2}/export": {
      get: {
        summary: "Export country brief",
        operationId: "exportCountryBrief",
        parameters: [
          { name: "iso2", in: "path", required: true, schema: { type: "string" } },
          { name: "format", in: "query", schema: { enum: ["json", "csv", "markdown"] } },
        ],
      },
    },
    "/alerts": { get: { summary: "Recent alert events", operationId: "listAlerts" } },
    "/alerts/rules": { get: { summary: "Alert rules", operationId: "listAlertRules" } },
    "/preferences": {
      get: { summary: "User preferences (auth)", operationId: "getPreferences" },
      put: { summary: "Save preferences (auth)", operationId: "putPreferences" },
    },
    "/metrics": { get: { summary: "Prometheus metrics", operationId: "getMetrics" } },
  },
} as const;
