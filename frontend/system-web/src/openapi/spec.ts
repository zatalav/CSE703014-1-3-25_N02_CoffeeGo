import type { OpenAPISpec, FeatureOpenAPI } from "./types";

import { ordersApi } from "../features/orders/api/openapi";
import { staffApi } from "../features/staff/api/openapi";
import { branchInventoryApi } from "../features/branch-inventory/api/openapi";
import { branchDashboardApi } from "../features/branch-dashboard/api/openapi";
import { branchReportsApi } from "../features/branch-reports/api/openapi";
import { warehouseDashboardApi } from "../features/warehouse-dashboard/api/openapi";
import { stockMovementsApi } from "../features/stock-movements/api/openapi";
import { warehouseMapApi } from "../features/warehouse-map/api/openapi";
import { ingredientsApi } from "../features/ingredients/api/openapi";
import { suppliersApi } from "../features/suppliers/api/openapi";
import { warehouseReportsApi } from "../features/warehouse-reports/api/openapi";
import { branchesApi } from "../features/branches/api/openapi";

const FEATURES: FeatureOpenAPI[] = [
  branchDashboardApi,
  ordersApi,
  staffApi,
  branchInventoryApi,
  branchReportsApi,
  warehouseDashboardApi,
  stockMovementsApi,
  warehouseMapApi,
  ingredientsApi,
  suppliersApi,
  warehouseReportsApi,
  branchesApi,
];

function aggregate(): OpenAPISpec {
  const paths: OpenAPISpec["paths"] = {};
  const schemas: Record<string, unknown> = {};
  const tags = FEATURES.map(f => f.tag);

  for (const feat of FEATURES) {
    for (const [path, ops] of Object.entries(feat.paths)) {
      paths[path] = { ...(paths[path] ?? {}), ...ops };
    }
    if (feat.schemas) Object.assign(schemas, feat.schemas);
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "Trà Sữa Pro — Internal API",
      version: "1.0.0",
      description:
        "OpenAPI specification cho hệ thống quản lý chuỗi trà sữa. " +
        "Tổ chức theo Feature-based Domain-Driven modules.",
    },
    servers: [
      { url: "https://api.trasua-pro.example/v1", description: "Production" },
      { url: "http://localhost:4000/v1", description: "Local development" },
    ],
    tags,
    paths,
    components: { schemas },
  };
}

export const openApiSpec = aggregate();
