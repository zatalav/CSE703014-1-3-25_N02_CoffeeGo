import type { FeatureOpenAPI } from "../../../openapi/types";

const Employee = {
  type: "object",
  properties: {
    id: { type: "string" },
    fullName: { type: "string", example: "Lê Mai" },
    role: { type: "string", example: "Barista" },
    phone: { type: "string" },
    joinedAt: { type: "string", format: "date" },
    active: { type: "boolean" },
  },
};

const Shift = {
  type: "object",
  properties: {
    id: { type: "string" },
    employeeId: { type: "string" },
    date: { type: "string", format: "date" },
    type: { type: "string", enum: ["morning", "afternoon", "evening", "off"] },
  },
};

export const staffApi: FeatureOpenAPI = {
  tag: { name: "Staff", description: "Nhân viên & lịch ca làm việc" },
  schemas: { Employee, Shift },
  paths: {
    "/api/branches/{branchId}/employees": {
      get: {
        tags: ["Staff"],
        summary: "Danh sách nhân viên",
        operationId: "listEmployees",
        parameters: [{ name: "branchId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Employee" } } } } } },
      },
      post: {
        tags: ["Staff"],
        summary: "Thêm nhân viên",
        operationId: "createEmployee",
        parameters: [{ name: "branchId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Employee" } } } },
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/branches/{branchId}/shifts": {
      get: {
        tags: ["Staff"],
        summary: "Lịch ca của tuần",
        operationId: "listShifts",
        parameters: [
          { name: "branchId", in: "path", required: true, schema: { type: "string" } },
          { name: "weekOf", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Shift" } } } } } },
      },
      put: {
        tags: ["Staff"],
        summary: "Cập nhật ca làm việc",
        operationId: "updateShifts",
        parameters: [{ name: "branchId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Shift" } } } } },
        responses: { "200": { description: "Updated" } },
      },
    },
  },
};
