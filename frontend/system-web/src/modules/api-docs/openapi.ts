// OpenAPI 3.0 spec for the Trà Sữa Pro Admin backend.
// Edit this file to grow the API surface — Swagger UI renders it live.
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Trà Sữa Pro — Admin API",
    version: "1.0.0",
    description:
      "API quản trị chuỗi cửa hàng F&B. Mỗi module Admin (users, products, orders, …) tương ứng với một nhóm endpoint dưới đây. Tài liệu này được render bằng Swagger UI.",
  },
  servers: [
    { url: "https://api.trasua.pro/v1", description: "Production" },
    { url: "https://staging-api.trasua.pro/v1", description: "Staging" },
    { url: "http://localhost:4000/v1", description: "Local dev" },
  ],
  tags: [
    { name: "Auth", description: "Đăng nhập, đăng xuất, đổi mật khẩu" },
    { name: "Users", description: "Nhân viên, quản lý chi nhánh, phân quyền" },
    { name: "Customers", description: "Tài khoản khách hàng, hạng thành viên" },
    { name: "Branches", description: "Chi nhánh cửa hàng" },
    { name: "Products", description: "Sản phẩm, danh mục, topping, combo, công thức" },
    { name: "Inventory", description: "Nhà cung cấp, nguyên liệu, lịch sử kho" },
    { name: "Orders", description: "Đơn hàng tại cửa hàng & online" },
    { name: "CRM", description: "Voucher, đánh giá, hạng thành viên" },
    { name: "Reports", description: "Báo cáo doanh thu, kho, khách hàng" },
    { name: "AI", description: "Dự báo, phát hiện bất thường, phân tích menu" },
    { name: "Content", description: "Banner và bài viết tin tức" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          code: { type: "string", example: "VALIDATION_ERROR" },
          message: { type: "string", example: "Trường name không được để trống" },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          pageSize: { type: "integer", example: 20 },
          total: { type: "integer", example: 124 },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "admin@trasua.vn" },
          password: { type: "string", format: "password", example: "••••••••" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          token: { type: "string", example: "eyJhbGciOiJI..." },
          expiresIn: { type: "integer", example: 3600 },
          user: { $ref: "#/components/schemas/User" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", example: "NV-0001" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string", example: "0901 234 567" },
          role: { type: "string", enum: ["super_admin", "manager", "staff"] },
          branchId: { type: "string", nullable: true, example: "CN-001" },
          status: { type: "string", enum: ["active", "inactive"] },
        },
      },
      Customer: {
        type: "object",
        properties: {
          id: { type: "string", example: "KH-0001" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          phone: { type: "string" },
          address: { type: "string" },
          tier: { type: "string", enum: ["Gold", "Platinum", "Black"] },
          status: { type: "string", enum: ["active", "inactive", "blocked"] },
          points: { type: "integer" },
          totalOrders: { type: "integer" },
          totalSpent: { type: "integer" },
          joinedAt: { type: "string", format: "date" },
          birthday: { type: "string", format: "date", nullable: true },
        },
      },
      Branch: {
        type: "object",
        properties: {
          id: { type: "string", example: "CN-001" },
          name: { type: "string" },
          address: { type: "string" },
          phone: { type: "string" },
          managerId: { type: "string" },
          status: { type: "string", enum: ["open", "closed", "maintenance"] },
        },
      },
      Product: {
        type: "object",
        properties: {
          id: { type: "string", example: "SP-0001" },
          name: { type: "string" },
          categoryId: { type: "string", example: "CAT-01" },
          price: { type: "integer", example: 45000 },
          imageUrl: { type: "string", format: "uri" },
          available: { type: "boolean" },
        },
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "string", example: "DH-25001" },
          branchId: { type: "string" },
          customerId: { type: "string", nullable: true },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                productId: { type: "string" },
                qty: { type: "integer" },
                price: { type: "integer" },
                toppings: { type: "array", items: { type: "string" } },
              },
            },
          },
          subtotal: { type: "integer" },
          discount: { type: "integer" },
          total: { type: "integer" },
          status: { type: "string", enum: ["pending", "preparing", "completed", "cancelled"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      InventoryMovement: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["in", "out", "adjust"] },
          ingredientId: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string", example: "kg" },
          branchId: { type: "string" },
          note: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Voucher: {
        type: "object",
        properties: {
          code: { type: "string", example: "WELCOME20" },
          type: { type: "string", enum: ["percent", "amount"] },
          value: { type: "integer", example: 20 },
          minOrder: { type: "integer", example: 50000 },
          startAt: { type: "string", format: "date" },
          endAt: { type: "string", format: "date" },
          usageLimit: { type: "integer" },
          status: { type: "string", enum: ["active", "expired", "disabled"] },
        },
      },
      RevenueReport: {
        type: "object",
        properties: {
          period: { type: "string", example: "2026-05" },
          totalRevenue: { type: "integer" },
          totalOrders: { type: "integer" },
          aov: { type: "integer", description: "Average order value" },
          byBranch: {
            type: "array",
            items: {
              type: "object",
              properties: {
                branchId: { type: "string" },
                revenue: { type: "integer" },
              },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // ===== AUTH =====
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Đăng nhập admin",
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } },
        },
        responses: {
          200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } } },
          401: { description: "Sai email/mật khẩu", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/auth/logout": {
      post: { tags: ["Auth"], summary: "Đăng xuất", responses: { 204: { description: "No content" } } },
    },
    "/auth/change-password": {
      post: {
        tags: ["Auth"],
        summary: "Đổi mật khẩu",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword", "newPassword"],
                properties: {
                  currentPassword: { type: "string", format: "password" },
                  newPassword: { type: "string", format: "password", minLength: 6 },
                },
              },
            },
          },
        },
        responses: { 204: { description: "Đổi thành công" }, 400: { description: "Mật khẩu không hợp lệ" } },
      },
    },

    // ===== USERS =====
    "/users": {
      get: {
        tags: ["Users"], summary: "Danh sách nhân viên",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
          { name: "branchId", in: "query", schema: { type: "string" } },
          { name: "role", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/User" } },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
        },
      },
      post: { tags: ["Users"], summary: "Tạo nhân viên mới", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } }, responses: { 201: { description: "Đã tạo" } } },
    },
    "/users/{id}": {
      get: { tags: ["Users"], summary: "Chi tiết nhân viên", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } }, 404: { description: "Không tồn tại" } } },
      put: { tags: ["Users"], summary: "Cập nhật nhân viên", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } }, responses: { 200: { description: "OK" } } },
      delete: { tags: ["Users"], summary: "Xóa nhân viên", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 204: { description: "Đã xóa" } } },
    },
    "/users/{id}/permissions": {
      put: { tags: ["Users"], summary: "Cập nhật phân quyền", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { permissions: { type: "array", items: { type: "string" } } } } } } }, responses: { 200: { description: "OK" } } },
    },

    // ===== CUSTOMERS =====
    "/customers": {
      get: { tags: ["Customers"], summary: "Danh sách khách hàng", parameters: [{ name: "q", in: "query", schema: { type: "string" } }, { name: "tier", in: "query", schema: { type: "string" } }, { name: "status", in: "query", schema: { type: "string" } }], responses: { 200: { description: "OK", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Customer" } }, pagination: { $ref: "#/components/schemas/Pagination" } } } } } } } },
      post: { tags: ["Customers"], summary: "Thêm khách hàng", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Customer" } } } }, responses: { 201: { description: "Đã tạo" } } },
    },
    "/customers/{id}": {
      get: { tags: ["Customers"], summary: "Chi tiết khách hàng", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Customer" } } } } } },
      put: { tags: ["Customers"], summary: "Cập nhật khách hàng", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Customer" } } } }, responses: { 200: { description: "OK" } } },
      delete: { tags: ["Customers"], summary: "Xóa khách hàng", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 204: { description: "Đã xóa" } } },
    },

    // ===== BRANCHES =====
    "/branches": {
      get: { tags: ["Branches"], summary: "Danh sách chi nhánh", responses: { 200: { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Branch" } } } } } } },
      post: { tags: ["Branches"], summary: "Tạo chi nhánh", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Branch" } } } }, responses: { 201: { description: "Đã tạo" } } },
    },
    "/branches/{id}": {
      get: { tags: ["Branches"], summary: "Chi tiết chi nhánh", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "OK" } } },
      put: { tags: ["Branches"], summary: "Cập nhật chi nhánh", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Branch" } } } }, responses: { 200: { description: "OK" } } },
    },

    // ===== PRODUCTS =====
    "/products": {
      get: { tags: ["Products"], summary: "Danh sách sản phẩm", responses: { 200: { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Product" } } } } } } },
      post: { tags: ["Products"], summary: "Tạo sản phẩm", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } } }, responses: { 201: { description: "Đã tạo" } } },
    },
    "/products/{id}": {
      get: { tags: ["Products"], summary: "Chi tiết sản phẩm", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "OK" } } },
      put: { tags: ["Products"], summary: "Cập nhật sản phẩm", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } } }, responses: { 200: { description: "OK" } } },
      delete: { tags: ["Products"], summary: "Xóa sản phẩm", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 204: { description: "Đã xóa" } } },
    },
    "/product-categories": { get: { tags: ["Products"], summary: "Danh mục sản phẩm", responses: { 200: { description: "OK" } } } },
    "/toppings": { get: { tags: ["Products"], summary: "Danh sách topping", responses: { 200: { description: "OK" } } } },
    "/combos": { get: { tags: ["Products"], summary: "Danh sách combo", responses: { 200: { description: "OK" } } } },
    "/recipes": { get: { tags: ["Products"], summary: "Công thức pha chế", responses: { 200: { description: "OK" } } } },

    // ===== INVENTORY =====
    "/inventory/suppliers": { get: { tags: ["Inventory"], summary: "Nhà cung cấp", responses: { 200: { description: "OK" } } } },
    "/inventory/ingredients": { get: { tags: ["Inventory"], summary: "Nguyên liệu", responses: { 200: { description: "OK" } } } },
    "/inventory/movements": {
      get: { tags: ["Inventory"], summary: "Lịch sử nhập/xuất kho", parameters: [{ name: "branchId", in: "query", schema: { type: "string" } }, { name: "type", in: "query", schema: { type: "string", enum: ["in", "out", "adjust"] } }], responses: { 200: { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/InventoryMovement" } } } } } } },
      post: { tags: ["Inventory"], summary: "Ghi nhận biến động kho", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/InventoryMovement" } } } }, responses: { 201: { description: "Đã ghi nhận" } } },
    },

    // ===== ORDERS =====
    "/orders": {
      get: { tags: ["Orders"], summary: "Danh sách đơn hàng", parameters: [{ name: "branchId", in: "query", schema: { type: "string" } }, { name: "status", in: "query", schema: { type: "string" } }, { name: "from", in: "query", schema: { type: "string", format: "date" } }, { name: "to", in: "query", schema: { type: "string", format: "date" } }], responses: { 200: { description: "OK", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Order" } }, pagination: { $ref: "#/components/schemas/Pagination" } } } } } } } },
      post: { tags: ["Orders"], summary: "Tạo đơn hàng", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Order" } } } }, responses: { 201: { description: "Đã tạo" } } },
    },
    "/orders/{id}": {
      get: { tags: ["Orders"], summary: "Chi tiết đơn", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "OK" } } },
      patch: { tags: ["Orders"], summary: "Cập nhật trạng thái đơn", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", enum: ["preparing", "completed", "cancelled"] } } } } } }, responses: { 200: { description: "OK" } } },
    },

    // ===== CRM =====
    "/crm/vouchers": {
      get: { tags: ["CRM"], summary: "Danh sách voucher", responses: { 200: { description: "OK", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Voucher" } } } } } } },
      post: { tags: ["CRM"], summary: "Tạo voucher", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Voucher" } } } }, responses: { 201: { description: "Đã tạo" } } },
    },
    "/crm/reviews": { get: { tags: ["CRM"], summary: "Đánh giá của khách", responses: { 200: { description: "OK" } } } },
    "/crm/membership-tiers": { get: { tags: ["CRM"], summary: "Cấu hình hạng thành viên", responses: { 200: { description: "OK" } } } },

    // ===== REPORTS =====
    "/reports/revenue": { get: { tags: ["Reports"], summary: "Báo cáo doanh thu", parameters: [{ name: "period", in: "query", schema: { type: "string", example: "2026-05" } }], responses: { 200: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/RevenueReport" } } } } } } },
    "/reports/inventory": { get: { tags: ["Reports"], summary: "Báo cáo nhập xuất tồn", responses: { 200: { description: "OK" } } } },
    "/reports/orders": { get: { tags: ["Reports"], summary: "Báo cáo đơn hàng", responses: { 200: { description: "OK" } } } },
    "/reports/customers": { get: { tags: ["Reports"], summary: "Báo cáo khách hàng", responses: { 200: { description: "OK" } } } },

    // ===== AI =====
    "/admin/ai/demand-forecast": { get: { tags: ["AI"], summary: "Dự báo nhu cầu nguyên liệu từ CSDL", parameters: [{ name: "horizon", in: "query", schema: { type: "integer", example: 7, description: "Số ngày dự báo" } }, { name: "branchId", in: "query", schema: { type: "integer" } }], responses: { 200: { description: "OK" } } } },
    "/admin/ai/anomaly-detection": { get: { tags: ["AI"], summary: "Phát hiện bất thường từ CSDL", responses: { 200: { description: "OK" } } } },
    "/admin/ai/menu-trends": { get: { tags: ["AI"], summary: "Phân tích xu hướng menu từ CSDL", responses: { 200: { description: "OK" } } } },
    "/admin/ai/customer-behavior": { get: { tags: ["AI"], summary: "Phân tích hành vi khách từ CSDL", responses: { 200: { description: "OK" } } } },
    "/admin/ai/product-revenue-analysis": { get: { tags: ["AI"], summary: "Phân tích doanh thu theo món từ CSDL", responses: { 200: { description: "OK" } } } },
    "/admin/ai/best-slow-products": { get: { tags: ["AI"], summary: "Ma trận BCG bán chạy/chậm từ CSDL", responses: { 200: { description: "OK" } } } },

    // ===== CONTENT =====
    "/content/banners": {
      get: { tags: ["Content"], summary: "Danh sách banner", responses: { 200: { description: "OK" } } },
      post: { tags: ["Content"], summary: "Đăng banner mới", responses: { 201: { description: "Đã tạo" } } },
    },
    "/content/news": {
      get: { tags: ["Content"], summary: "Danh sách tin tức", responses: { 200: { description: "OK" } } },
      post: { tags: ["Content"], summary: "Đăng bài tin tức", responses: { 201: { description: "Đã tạo" } } },
    },
  },
} as const;
