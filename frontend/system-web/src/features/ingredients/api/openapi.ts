import type { FeatureOpenAPI } from "../../../openapi/types";

const Ingredient = {
  type: "object",
  required: ["id", "name", "category", "unit"],
  properties: {
    id: { type: "string" },
    name: { type: "string", example: "Bột trà sữa" },
    category: { type: "string", example: "Bột & Nguyên liệu khô" },
    unit: { type: "string", example: "kg" },
    minStock: { type: "number" },
    primarySupplierId: { type: "string" },
  },
};

export const ingredientsApi: FeatureOpenAPI = {
  tag: { name: "Ingredients", description: "Danh mục nguyên liệu" },
  schemas: { Ingredient },
  paths: {
    "/api/ingredients": {
      get: {
        tags: ["Ingredients"],
        summary: "Danh sách nguyên liệu",
        operationId: "listIngredients",
        parameters: [
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "q", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Ingredient" } } } } } },
      },
      post: {
        tags: ["Ingredients"],
        summary: "Tạo nguyên liệu mới",
        operationId: "createIngredient",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Ingredient" } } } },
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/ingredients/{id}": {
      get: {
        tags: ["Ingredients"],
        summary: "Chi tiết nguyên liệu",
        operationId: "getIngredient",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Ingredient" } } } } },
      },
      patch: {
        tags: ["Ingredients"],
        summary: "Cập nhật nguyên liệu",
        operationId: "updateIngredient",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Ingredient" } } } },
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        tags: ["Ingredients"],
        summary: "Xoá nguyên liệu",
        operationId: "deleteIngredient",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Deleted" } },
      },
    },
  },
};
