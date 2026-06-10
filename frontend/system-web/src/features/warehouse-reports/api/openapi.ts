import type { FeatureOpenAPI } from "../../../openapi/types";

export const warehouseReportsApi: FeatureOpenAPI = {
  tag: { name: "WarehouseReports", description: "Báo cáo kho tổng thể" },
  paths: {
    "/api/warehouses/{warehouseId}/reports/inbound-outbound": {
      get: {
        tags: ["WarehouseReports"],
        summary: "Tổng nhập/xuất theo kỳ",
        operationId: "getInboundOutboundReport",
        parameters: [
          { name: "warehouseId", in: "path", required: true, schema: { type: "string" } },
          { name: "period", in: "query", schema: { type: "string", enum: ["week", "month", "quarter", "year"] } },
        ],
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/warehouses/{warehouseId}/reports/stock-by-category": {
      get: {
        tags: ["WarehouseReports"],
        summary: "Cơ cấu tồn kho theo nhóm nguyên liệu",
        operationId: "getStockByCategory",
        parameters: [{ name: "warehouseId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/warehouses/{warehouseId}/reports/low-stock": {
      get: {
        tags: ["WarehouseReports"],
        summary: "Danh sách nguyên liệu sắp hết",
        operationId: "getLowStockReport",
        parameters: [{ name: "warehouseId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK" } },
      },
    },
  },
};
