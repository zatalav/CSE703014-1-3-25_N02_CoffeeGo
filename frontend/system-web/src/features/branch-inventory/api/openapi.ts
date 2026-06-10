import type { FeatureOpenAPI } from "../../../openapi/types";

const BranchStock = {
  type: "object",
  properties: {
    ingredientId: { type: "string" },
    ingredientName: { type: "string" },
    currentQty: { type: "number" },
    minQty: { type: "number" },
    unit: { type: "string" },
    status: { type: "string", enum: ["ok", "low", "critical"] },
  },
};

const RestockRequestItem = {
  type: "object",
  required: ["ingredientId", "quantity"],
  properties: {
    ingredientId: { type: "string" },
    quantity: { type: "number" },
    unit: { type: "string" },
    currentQuantity: { type: "number" },
    minQuantity: { type: "number" },
  },
};

const RestockRequest = {
  type: "object",
  required: ["items"],
  properties: {
    branchId: { type: "string" },
    employeeId: { type: "string" },
    note: { type: "string" },
    items: {
      type: "array",
      items: { $ref: "#/components/schemas/RestockRequestItem" },
      minItems: 1,
    },
  },
};

const RestockRequestStatus = {
  type: "object",
  required: ["status"],
  properties: {
    status: { type: "string", enum: ["pending", "processing", "fulfilled", "cancelled"] },
  },
};

export const branchInventoryApi: FeatureOpenAPI = {
  tag: { name: "BranchInventory", description: "Tồn kho nguyên liệu tại chi nhánh" },
  schemas: { BranchStock, RestockRequestItem, RestockRequest, RestockRequestStatus },
  paths: {
    "/api/branches/{branchId}/inventory": {
      get: {
        tags: ["BranchInventory"],
        summary: "Tồn kho hiện tại của chi nhánh",
        operationId: "getBranchInventory",
        parameters: [{ name: "branchId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/BranchStock" } } } } } },
      },
    },
    "/api/admin/inventory/restock-requests": {
      get: {
        tags: ["BranchInventory"],
        summary: "Danh sách yêu cầu nhập hàng",
        operationId: "listRestockRequests",
        parameters: [
          { name: "branchId", in: "query", required: false, schema: { type: "string" } },
          { name: "status", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK" } },
      },
      post: {
        tags: ["BranchInventory"],
        summary: "Tạo yêu cầu nhập hàng",
        operationId: "requestRestock",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RestockRequest" } } } },
        responses: { "201": { description: "Đã gửi yêu cầu" } },
      },
    },
    "/api/admin/inventory/restock-requests/{requestId}/status": {
      patch: {
        tags: ["BranchInventory"],
        summary: "Cập nhật trạng thái yêu cầu nhập hàng",
        operationId: "updateRestockRequestStatus",
        parameters: [{ name: "requestId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RestockRequestStatus" } } } },
        responses: { "200": { description: "Đã cập nhật trạng thái" } },
      },
    },
  },
};
