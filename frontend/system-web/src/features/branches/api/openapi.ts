import type { FeatureOpenAPI } from "../../../openapi/types";

const Branch = {
  type: "object",
  required: ["id", "name", "address"],
  properties: {
    id: { type: "string" },
    name: { type: "string", example: "Chi nhánh Quận 1" },
    address: { type: "string" },
    phone: { type: "string" },
    managerId: { type: "string" },
    openingHours: { type: "string", example: "07:00 - 22:00" },
    status: { type: "string", enum: ["active", "paused", "closed"] },
  },
};

export const branchesApi: FeatureOpenAPI = {
  tag: { name: "Branches", description: "Quản lý chi nhánh" },
  schemas: { Branch },
  paths: {
    "/api/branches": {
      get: { tags: ["Branches"], summary: "Danh sách chi nhánh", operationId: "listBranches", responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Branch" } } } } } } },
      post: { tags: ["Branches"], summary: "Tạo chi nhánh mới", operationId: "createBranch", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Branch" } } } }, responses: { "201": { description: "Created" } } },
    },
    "/api/branches/{id}": {
      get: { tags: ["Branches"], summary: "Chi tiết chi nhánh", operationId: "getBranch", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Branch" } } } } } },
      patch: { tags: ["Branches"], summary: "Cập nhật chi nhánh", operationId: "updateBranch", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Branch" } } } }, responses: { "200": { description: "Updated" } } },
      delete: { tags: ["Branches"], summary: "Xoá chi nhánh", operationId: "deleteBranch", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "204": { description: "Deleted" } } },
    },
  },
};
