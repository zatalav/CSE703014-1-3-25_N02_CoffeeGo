import type { FeatureOpenAPI } from "../../../openapi/types";

const Supplier = {
  type: "object",
  required: ["id", "name"],
  properties: {
    id: { type: "string" },
    name: { type: "string", example: "Công ty Linh Phát" },
    categories: { type: "array", items: { type: "string" } },
    phone: { type: "string" },
    email: { type: "string", format: "email" },
    address: { type: "string" },
    rating: { type: "number", minimum: 0, maximum: 5 },
    active: { type: "boolean" },
  },
};

export const suppliersApi: FeatureOpenAPI = {
  tag: { name: "Suppliers", description: "Nhà cung cấp nguyên liệu" },
  schemas: { Supplier },
  paths: {
    "/api/suppliers": {
      get: {
        tags: ["Suppliers"],
        summary: "Danh sách nhà cung cấp",
        operationId: "listSuppliers",
        parameters: [{ name: "q", in: "query", schema: { type: "string" } }],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Supplier" } } } } } },
      },
      post: {
        tags: ["Suppliers"],
        summary: "Thêm nhà cung cấp",
        operationId: "createSupplier",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Supplier" } } } },
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/suppliers/{id}": {
      get: { tags: ["Suppliers"], summary: "Chi tiết nhà cung cấp", operationId: "getSupplier", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
      patch: { tags: ["Suppliers"], summary: "Cập nhật", operationId: "updateSupplier", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Supplier" } } } }, responses: { "200": { description: "Updated" } } },
      delete: { tags: ["Suppliers"], summary: "Xoá", operationId: "deleteSupplier", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "204": { description: "Deleted" } } },
    },
  },
};
