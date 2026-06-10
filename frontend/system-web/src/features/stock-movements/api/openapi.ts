import type { FeatureOpenAPI } from "../../../openapi/types";

const StockMovement = {
  type: "object",
  required: ["type", "ingredientId", "quantity"],
  properties: {
    id: { type: "string", example: "PN-204" },
    type: { type: "string", enum: ["inbound", "outbound", "adjustment"] },
    ingredientId: { type: "string" },
    quantity: { type: "number" },
    counterpartyId: { type: "string", description: "Supplier ID hoặc Branch ID" },
    occurredAt: { type: "string", format: "date-time" },
    status: { type: "string", enum: ["draft", "confirmed", "in-transit", "completed", "cancelled"] },
    note: { type: "string" },
  },
};

export const stockMovementsApi: FeatureOpenAPI = {
  tag: { name: "StockMovements", description: "Phiếu nhập / xuất kho" },
  schemas: { StockMovement },
  paths: {
    "/api/warehouses/{warehouseId}/stock-movements": {
      get: {
        tags: ["StockMovements"],
        summary: "Lịch sử nhập-xuất kho",
        operationId: "listStockMovements",
        parameters: [
          { name: "warehouseId", in: "path", required: true, schema: { type: "string" } },
          { name: "type", in: "query", schema: { type: "string", enum: ["inbound", "outbound", "adjustment"] } },
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/StockMovement" } } } } } },
      },
      post: {
        tags: ["StockMovements"],
        summary: "Tạo phiếu nhập / xuất",
        operationId: "createStockMovement",
        parameters: [{ name: "warehouseId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/StockMovement" } } } },
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/warehouses/{warehouseId}/stock-movements/{movementId}/confirm": {
      post: {
        tags: ["StockMovements"],
        summary: "Xác nhận phiếu",
        operationId: "confirmStockMovement",
        parameters: [
          { name: "warehouseId", in: "path", required: true, schema: { type: "string" } },
          { name: "movementId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Confirmed" } },
      },
    },
  },
};
