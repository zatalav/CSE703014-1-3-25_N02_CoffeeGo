import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { openApiSpec } from "../../../openapi/spec";

export function ApiDocsPage() {
  return (
    <div className="h-full overflow-auto bg-white">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-900 to-emerald-900 text-white">
        <h1 className="text-xl font-semibold">API Documentation</h1>
        <p className="text-sm text-slate-300">
          OpenAPI 3.0 spec được tổng hợp tự động từ từng feature module.
        </p>
      </div>
      <SwaggerUI spec={openApiSpec} docExpansion="list" defaultModelsExpandDepth={0} />
    </div>
  );
}
