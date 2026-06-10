// Minimal OpenAPI 3.0 type subset used by feature specs
export type OpenAPIPath = Record<string, OpenAPIOperation>;
export type OpenAPISpec = {
  openapi: "3.0.3";
  info: { title: string; version: string; description?: string };
  servers?: { url: string; description?: string }[];
  tags?: { name: string; description?: string }[];
  paths: Record<string, OpenAPIPath>;
  components?: { schemas?: Record<string, unknown>; securitySchemes?: Record<string, unknown> };
};
export type OpenAPIOperation = {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: unknown[];
  requestBody?: unknown;
  responses: Record<string, { description: string; content?: Record<string, { schema: unknown }> }>;
};

export type FeatureOpenAPI = {
  tag: { name: string; description: string };
  paths: Record<string, OpenAPIPath>;
  schemas?: Record<string, unknown>;
};
