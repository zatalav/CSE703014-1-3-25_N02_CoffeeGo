# Swagger UI API Notes

Thu muc nay dung de luu tai lieu API/export tu Swagger UI cho cac ung dung frontend.

- Swagger UI runtime cua backend: `/swagger-ui/index.html`
- OpenAPI JSON mac dinh cua springdoc: `/v3/api-docs`
- OpenAPI YAML mac dinh cua springdoc: `/v3/api-docs.yaml`

Quy uoc luu file:

- `exports/openapi.json`: ban export JSON tu Swagger UI/springdoc.
- `exports/openapi.yaml`: ban export YAML tu Swagger UI/springdoc.
- `notes/`: ghi chu mapping API cho tung actor/frontend neu can.

Hien tai chua them API moi va chua tao service goi API o frontend. Cac trang Admin trong `frontend/admin` van dung mock/static data cho den khi endpoint ro rang.
