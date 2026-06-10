import type { FeatureOpenAPI } from "../../../openapi/types";

const BranchKpi = {
  type: "object",
  properties: {
    revenueToday: { type: "number" },
    ordersToday: { type: "integer" },
    customersToday: { type: "integer" },
    avgOrderValue: { type: "number" },
  },
};

export const branchDashboardApi: FeatureOpenAPI = {
  tag: { name: "BranchDashboard", description: "Tổng quan chi nhánh" },
  schemas: { BranchKpi },
  paths: {
    "/api/branches/{branchId}/dashboard/kpi": {
      get: {
        tags: ["BranchDashboard"],
        summary: "Chỉ số tổng quan hôm nay",
        operationId: "getBranchKpi",
        parameters: [{ name: "branchId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/BranchKpi" } } } } },
      },
    },
    "/api/branches/{branchId}/dashboard/revenue-hourly": {
      get: {
        tags: ["BranchDashboard"],
        summary: "Doanh thu theo giờ trong ngày",
        operationId: "getHourlyRevenue",
        parameters: [
          { name: "branchId", in: "path", required: true, schema: { type: "string" } },
          { name: "date", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { type: "object", properties: { hour: { type: "string" }, revenue: { type: "number" } } } } } } } },
      },
    },
  },
};
