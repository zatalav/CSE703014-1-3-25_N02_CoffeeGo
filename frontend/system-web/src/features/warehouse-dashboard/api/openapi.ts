import type { FeatureOpenAPI } from "../../../openapi/types";

const WarehouseKpi = {
  type: "object",
  properties: {
    totalStockValue: { type: "number" },
    weeklyInbound: { type: "integer" },
    weeklyOutbound: { type: "integer" },
    lowStockAlerts: { type: "integer" },
  },
};

export const warehouseDashboardApi: FeatureOpenAPI = {
  tag: { name: "WarehouseDashboard", description: "Tổng quan kho trung tâm" },
  schemas: { WarehouseKpi },
  paths: {
    "/api/warehouses/{warehouseId}/dashboard/kpi": {
      get: {
        tags: ["WarehouseDashboard"],
        summary: "Chỉ số tổng quan kho",
        operationId: "getWarehouseKpi",
        parameters: [{ name: "warehouseId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/WarehouseKpi" } } } } },
      },
    },
    "/api/warehouses/{warehouseId}/dashboard/flow": {
      get: {
        tags: ["WarehouseDashboard"],
        summary: "Biến động nhập-xuất 7 ngày gần nhất",
        operationId: "getWarehouseFlow",
        parameters: [{ name: "warehouseId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK" } },
      },
    },
  },
};
