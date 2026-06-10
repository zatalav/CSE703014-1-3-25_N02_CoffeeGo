import type { FeatureOpenAPI } from "../../../openapi/types";

const OrderSchema = {
  type: "object",
  required: ["id", "customerName", "items", "total", "status", "createdAt"],
  properties: {
    id: { type: "string", example: "DH-1042" },
    customerName: { type: "string", example: "Lê Thị Hồng" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          productId: { type: "string" },
          productName: { type: "string" },
          quantity: { type: "integer", minimum: 1 },
          unitPrice: { type: "number" },
        },
      },
    },
    total: { type: "number", example: 55000 },
    status: { type: "string", enum: ["pending", "preparing", "completed", "cancelled"] },
    createdAt: { type: "string", format: "date-time" },
  },
};

export const ordersApi: FeatureOpenAPI = {
  tag: { name: "Orders", description: "Quản lý đơn hàng tại chi nhánh" },
  schemas: { Order: OrderSchema },
  paths: {
    "/api/branches/{branchId}/orders": {
      get: {
        tags: ["Orders"],
        summary: "Lấy danh sách đơn hàng của chi nhánh",
        operationId: "listOrders",
        parameters: [
          { name: "branchId", in: "path", required: true, schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["pending", "preparing", "completed", "cancelled"] } },
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: {
          "200": {
            description: "Danh sách đơn hàng",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Order" } } } },
          },
        },
      },
      post: {
        tags: ["Orders"],
        summary: "Tạo đơn hàng mới",
        operationId: "createOrder",
        parameters: [{ name: "branchId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } },
        },
        responses: { "201": { description: "Đã tạo", content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } } } },
      },
    },
    "/api/branches/{branchId}/orders/{orderId}": {
      get: {
        tags: ["Orders"],
        summary: "Xem chi tiết đơn",
        operationId: "getOrder",
        parameters: [
          { name: "branchId", in: "path", required: true, schema: { type: "string" } },
          { name: "orderId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Đơn hàng", content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } } } },
      },
      patch: {
        tags: ["Orders"],
        summary: "Cập nhật trạng thái đơn",
        operationId: "updateOrderStatus",
        parameters: [
          { name: "branchId", in: "path", required: true, schema: { type: "string" } },
          { name: "orderId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" } } } } },
        },
        responses: { "200": { description: "Đã cập nhật" } },
      },
    },
  },
};
