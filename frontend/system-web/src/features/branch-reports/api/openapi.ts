import type { FeatureOpenAPI } from "../../../openapi/types";

export const branchReportsApi: FeatureOpenAPI = {
  tag: { name: "BranchReports", description: "Báo cáo doanh thu / sản phẩm chi nhánh" },
  paths: {
    "/api/branches/{branchId}/reports/revenue": {
      get: {
        tags: ["BranchReports"],
        summary: "Báo cáo doanh thu theo kỳ",
        operationId: "getBranchRevenueReport",
        parameters: [
          { name: "branchId", in: "path", required: true, schema: { type: "string" } },
          { name: "period", in: "query", schema: { type: "string", enum: ["day", "week", "month", "year"] } },
        ],
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/branches/{branchId}/reports/top-products": {
      get: {
        tags: ["BranchReports"],
        summary: "Top sản phẩm bán chạy",
        operationId: "getTopProducts",
        parameters: [
          { name: "branchId", in: "path", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
        ],
        responses: { "200": { description: "OK" } },
      },
    },
  },
};
