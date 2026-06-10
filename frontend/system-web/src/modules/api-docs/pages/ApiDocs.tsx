import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { openApiSpec } from "../openapi";

export function ApiDocs() {
  return (
    <div className="space-y-4">
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F4761" }}>API Documentation</h1>
        <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
          Tài liệu API của hệ thống Admin, render bằng Swagger UI từ spec OpenAPI 3.0 trong{" "}
          <code style={{ background: "#F3F4F6", padding: "1px 6px", borderRadius: 4 }}>
            src/modules/api-docs/openapi.ts
          </code>
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <SwaggerUI spec={openApiSpec as object} docExpansion="list" defaultModelsExpandDepth={0} />
      </div>
    </div>
  );
}
