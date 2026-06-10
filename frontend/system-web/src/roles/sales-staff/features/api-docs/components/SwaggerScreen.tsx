import { useMemo } from "react";
import yaml from "js-yaml";
// @ts-ignore - vite raw import
import openapiRaw from "../../../api/openapi.yaml?raw";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export function SwaggerScreen() {
  const spec = useMemo(() => yaml.load(openapiRaw) as object, []);

  return (
    <div className="h-full overflow-y-auto" style={{ background: "#FEFAF6" }}>
      <div className="px-4 py-3 border-b" style={{ background: "#FDF5EC", borderColor: "#E8D5C0" }}>
        <h2 style={{ color: "#2C1A0E", fontWeight: 700, fontSize: "1rem" }}>API Documentation</h2>
        <p style={{ color: "#8B7355", fontSize: "0.78rem" }}>
          OpenAPI 3.0 - Spec: <code style={{ color: "#7B4A2D" }}>src/api/openapi.yaml</code>
        </p>
      </div>
      <SwaggerUI spec={spec} docExpansion="list" defaultModelsExpandDepth={1} />
    </div>
  );
}
