import type { FeatureOpenAPI } from "../../../openapi/types";

const WarehouseSlot = {
  type: "object",
  properties: {
    id: { type: "string", example: "A1" },
    zone: { type: "string", enum: ["A", "B", "C", "D"] },
    status: { type: "string", enum: ["empty", "in-use", "near-full", "full"] },
    ingredientId: { type: "string", nullable: true },
    occupancy: { type: "number", minimum: 0, maximum: 1 },
  },
};

export const warehouseMapApi: FeatureOpenAPI = {
  tag: { name: "WarehouseMap", description: "Sơ đồ vị trí lưu trữ trong kho" },
  schemas: { WarehouseSlot },
  paths: {
    "/api/warehouses/{warehouseId}/slots": {
      get: {
        tags: ["WarehouseMap"],
        summary: "Sơ đồ tất cả vị trí",
        operationId: "listSlots",
        parameters: [{ name: "warehouseId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/WarehouseSlot" } } } } } },
      },
    },
    "/api/warehouses/{warehouseId}/slots/{slotId}": {
      patch: {
        tags: ["WarehouseMap"],
        summary: "Gán nguyên liệu / cập nhật trạng thái slot",
        operationId: "updateSlot",
        parameters: [
          { name: "warehouseId", in: "path", required: true, schema: { type: "string" } },
          { name: "slotId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/WarehouseSlot" } } } },
        responses: { "200": { description: "Updated" } },
      },
    },
  },
};
