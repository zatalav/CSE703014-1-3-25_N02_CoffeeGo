from __future__ import annotations

import re
import shutil
import textwrap
from dataclasses import dataclass, field
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SQL_FILE = ROOT / "database" / "do_an_lien_nganh.sql"

BOOT_VERSION = "3.5.7"
SPRINGDOC_VERSION = "3.0.2"
JJWT_VERSION = "0.11.5"
GROUP_ID = "com.coffee"


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")


def package_name(module: str) -> str:
    return module.replace("-", "")


def pascal(value: str) -> str:
    parts = re.split(r"[^A-Za-z0-9]+", value.strip("_"))
    return "".join(part[:1].upper() + part[1:] for part in parts if part)


def camel(value: str) -> str:
    name = pascal(value)
    return name[:1].lower() + name[1:] if name else name


def entity_class(table: str) -> str:
    name = pascal(table)
    if name == "Order":
        return "OrderEntity"
    return name


def strip_line_comment(line: str) -> str:
    quote = None
    i = 0
    while i < len(line) - 1:
        ch = line[i]
        if quote:
            if ch == quote:
                quote = None
        elif ch in ("'", '"', "`"):
            quote = ch
        elif ch == "-" and line[i + 1] == "-":
            return line[:i]
        i += 1
    return line


def clean_sql(sql: str) -> str:
    return "\n".join(strip_line_comment(line) for line in sql.splitlines())


def split_top_level(value: str) -> list[str]:
    parts: list[str] = []
    current: list[str] = []
    depth = 0
    quote = None
    for ch in value:
        if quote:
            current.append(ch)
            if ch == quote:
                quote = None
            continue
        if ch in ("'", '"', "`"):
            quote = ch
            current.append(ch)
            continue
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            part = "".join(current).strip()
            if part:
                parts.append(part)
            current = []
        else:
            current.append(ch)
    part = "".join(current).strip()
    if part:
        parts.append(part)
    return parts


@dataclass
class Column:
    name: str
    field_name: str
    java_type: str
    sql_type: str
    nullable: bool
    unique: bool
    primary: bool
    auto_increment: bool
    length: int | None = None
    text: bool = False


@dataclass
class Table:
    name: str
    class_name: str
    columns: list[Column]
    pk: list[str]

    @property
    def id_type(self) -> str:
        if len(self.pk) == 1:
            return next(c.java_type for c in self.columns if c.name == self.pk[0])
        return f"{self.class_name}Id"

    @property
    def auto_id(self) -> bool:
        return len(self.pk) == 1 and any(c.primary and c.auto_increment for c in self.columns)


def java_type(sql_def: str) -> tuple[str, set[str], int | None, bool]:
    upper = sql_def.upper()
    length = None
    text = False
    m = re.match(r"([A-Z]+)\s*(\((.*?)\))?", upper, flags=re.I | re.S)
    raw = m.group(1).upper() if m else upper.split()[0]
    if m and m.group(3) and raw in {"VARCHAR", "CHAR"}:
        try:
            length = int(m.group(3).split(",")[0].strip())
        except ValueError:
            length = None
    imports: set[str] = set()
    if raw in {"BIGINT"}:
        return "Long", imports, length, text
    if raw in {"INT", "INTEGER", "SMALLINT"}:
        return "Integer", imports, length, text
    if raw in {"TINYINT", "BIT"}:
        return "Boolean", imports, length, text
    if raw in {"FLOAT", "DOUBLE", "REAL"}:
        return "Double", imports, length, text
    if raw in {"DECIMAL", "NUMERIC"}:
        imports.add("java.math.BigDecimal")
        return "BigDecimal", imports, length, text
    if raw == "DATE":
        imports.add("java.time.LocalDate")
        return "LocalDate", imports, length, text
    if raw == "TIME":
        imports.add("java.time.LocalTime")
        return "LocalTime", imports, length, text
    if raw in {"TIMESTAMP", "DATETIME"}:
        imports.add("java.time.LocalDateTime")
        return "LocalDateTime", imports, length, text
    if raw == "TEXT":
        text = True
    return "String", imports, length, text


def parse_schema() -> dict[str, Table]:
    sql = clean_sql(SQL_FILE.read_text(encoding="utf-8"))
    tables: dict[str, Table] = {}
    for match in re.finditer(r"CREATE\s+TABLE\s+([`\w]+)\s*\((.*?)\);", sql, flags=re.I | re.S):
        table_name = match.group(1).strip("`")
        body = match.group(2)
        parts = split_top_level(body)
        pk: list[str] = []
        raw_columns: list[tuple[str, str]] = []
        for part in parts:
            line = " ".join(part.strip().split())
            if not line:
                continue
            upper = line.upper()
            pk_match = re.search(r"PRIMARY\s+KEY\s*\(([^)]+)\)", line, flags=re.I)
            if pk_match:
                pk.extend([item.strip(" `") for item in pk_match.group(1).split(",")])
            if upper.startswith(("CONSTRAINT", "FOREIGN", "UNIQUE", "CHECK", "KEY", "INDEX", "PRIMARY KEY")):
                continue
            name_match = re.match(r"`?([A-Za-z_][A-Za-z0-9_]*)`?\s+(.+)", line, flags=re.S)
            if not name_match:
                continue
            col_name, definition = name_match.group(1), name_match.group(2)
            raw_columns.append((col_name, definition))
            if "PRIMARY KEY" in upper and col_name not in pk:
                pk.append(col_name)
        columns: list[Column] = []
        for col_name, definition in raw_columns:
            jtype, _, length, is_text = java_type(definition)
            upper = definition.upper()
            columns.append(
                Column(
                    name=col_name,
                    field_name=camel(col_name),
                    java_type=jtype,
                    sql_type=definition,
                    nullable=("NOT NULL" not in upper and col_name not in pk),
                    unique=("UNIQUE" in upper),
                    primary=(col_name in pk),
                    auto_increment=("AUTO_INCREMENT" in upper or "GENERATED" in upper or "SERIAL" in upper),
                    length=length,
                    text=is_text,
                )
            )
        tables[table_name] = Table(table_name, entity_class(table_name), columns, pk)
    return tables


SCHEMA = parse_schema()


SERVICE_TABLES: dict[str, list[str]] = {
    "auth-service": ["Role", "Employee", "Employee_detail", "Customer", "Customer_detail", "Branch"],
    "user-service": ["Employee", "Employee_detail", "Role", "Branch", "Customer", "Customer_detail", "Customer_loyalty", "Membership_rank", "Order_", "Point_history"],
    "branch-service": ["Branch", "Branch_hours", "Employee", "Employee_detail", "Role", "Work_schedule"],
    "product-service": ["Product_category", "Product", "Product_size", "Variant", "Product_variant", "Ingredient", "Combo", "Combo_detail", "Season", "Seasonal_product", "Recipe", "Recipe_detail"],
    "inventory-service": ["Ingredient_category", "Ingredient", "Supplier", "Supplier_detail", "Supplier_ingredient", "Warehouse_location", "Warehouse_stock", "Stock_import", "Stock_import_detail", "Stock_export", "Stock_export_detail", "Branch", "Employee"],
    "order-service": ["Order_", "Order_detail", "Order_detail_topping", "Order_detail_variant", "Payment", "Customer", "Customer_detail", "Product", "Combo", "Branch", "Coupon", "Customer_loyalty", "Point_history"],
    "customer-service": ["Customer", "Customer_detail", "Customer_loyalty", "Membership_rank", "Point_history", "Drips_exchange_history", "Drips_voucher", "Product_review", "Order_"],
    "promotion-service": ["Coupon", "Coupon_product", "Coupon_usage", "Product", "Customer", "Order_"],
    "content-service": ["Banner", "News", "Employee"],
}


@dataclass
class Resource:
    entity: str
    path: str
    service_name: str | None = None
    controller_name: str | None = None
    actions: list[tuple[str, str]] = field(default_factory=list)
    keyword: list[str] = field(default_factory=list)
    aliases: dict[str, str] = field(default_factory=dict)
    date_field: str | None = None
    methods: str = "crud"


RESOURCES: dict[str, list[Resource]] = {
    "user-service": [
        Resource("Employee", "/api/admin/users/employees", "EmployeeAdminService", "EmployeeAdminController", [("lock", "inactive"), ("unlock", "active")], ["name"], {"roleId": "roleId", "branchId": "branchId", "status": "status"}),
        Resource("Employee", "/api/admin/users/managers", "ManagerAdminService", "ManagerAdminController", [("lock", "inactive"), ("unlock", "active")], ["name"], {"roleId": "roleId", "branchId": "branchId", "status": "status"}),
        Resource("Customer", "/api/admin/users/customers", "UserCustomerAdminService", "UserCustomerAdminController", [("lock", "inactive"), ("unlock", "active")], ["name"], {"status": "status"}, "createdAt"),
        Resource("Role", "/api/admin/users/roles", "RoleAdminService", "RoleAdminController", [], ["roleName"], {"status": "status"}),
    ],
    "branch-service": [
        Resource("Branch", "/api/admin/branches", "BranchAdminService", "BranchAdminController", [("active", "active"), ("inactive", "inactive")], ["branchName", "address", "email"], {"status": "status", "branchType": "branchType"}),
        Resource("Work_schedule", "/api/admin/work-schedules", "WorkScheduleAdminService", "WorkScheduleAdminController", [], ["note"], {"branchId": "branchId", "employeeId": "employeeId", "status": "status"}, "workDate"),
    ],
    "product-service": [
        Resource("Product_category", "/api/admin/products/categories", "ProductCategoryAdminService", "ProductCategoryAdminController", [], ["pCategoryName"]),
        Resource("Product", "/api/admin/products", "ProductAdminService", "ProductAdminController", [("hide", "inactive"), ("show", "active")], ["productName", "description"], {"categoryId": "pCategoryId", "status": "status"}, "createdAt"),
        Resource("Product_size", "/api/admin/products/sizes", "ProductSizeAdminService", "ProductSizeAdminController", [], [], {"productId": "productId", "status": "status"}),
        Resource("Variant", "/api/admin/products/variants", "VariantAdminService", "VariantAdminController", [], ["variantGroup", "variantLabel"], {"status": "status"}),
        Resource("Combo", "/api/admin/products/combos", "ComboAdminService", "ComboAdminController", [("hide", "inactive"), ("show", "active")], ["comboName", "description"], {"status": "status"}),
        Resource("Season", "/api/admin/products/seasons", "SeasonAdminService", "SeasonAdminController", [], ["seasonName"], {"status": "status"}),
        Resource("Recipe", "/api/admin/products/recipes", "RecipeAdminService", "RecipeAdminController", [], ["recipeName", "description"], {"productId": "productId"}),
        Resource("Ingredient", "/api/admin/products/toppings", "ToppingAdminService", "ToppingAdminController", [("active", "active"), ("inactive", "inactive")], ["ingredientName"], {"categoryId": "iCategoryId", "status": "status"}),
    ],
    "inventory-service": [
        Resource("Ingredient_category", "/api/admin/inventory/ingredient-categories", "IngredientCategoryAdminService", "IngredientCategoryAdminController", [], ["iCategoryName"]),
        Resource("Ingredient", "/api/admin/inventory/ingredients", "IngredientAdminService", "IngredientAdminController", [("active", "active"), ("inactive", "inactive")], ["ingredientName"], {"categoryId": "iCategoryId", "status": "status"}),
        Resource("Supplier", "/api/admin/inventory/suppliers", "SupplierAdminService", "SupplierAdminController", [("active", "active"), ("inactive", "inactive")], ["supplierName", "address", "description"], {"status": "status"}),
        Resource("Warehouse_location", "/api/admin/inventory/locations", "WarehouseLocationAdminService", "WarehouseLocationAdminController", [], ["zone", "shelf", "slot"], {"branchId": "branchId"}),
        Resource("Warehouse_stock", "/api/admin/inventory/stocks", "WarehouseStockAdminService", "WarehouseStockAdminController", [], [], {"branchId": "branchId", "ingredientId": "ingredientId"}),
        Resource("Stock_import", "/api/admin/inventory/stock-imports", "StockImportAdminService", "StockImportAdminController", [], ["note"], {"branchId": "branchId", "supplierId": "supplierId", "employeeId": "employeeId"}, "importedAt"),
        Resource("Stock_export", "/api/admin/inventory/stock-exports", "StockExportAdminService", "StockExportAdminController", [], ["note"], {"fromBranchId": "fromBranchId", "toBranchId": "toBranchId", "employeeId": "employeeId"}, "exportedAt"),
    ],
    "order-service": [
        Resource("Order_", "/api/admin/orders", "OrderAdminService", "OrderAdminController", [], ["note"], {"branchId": "branchId", "status": "status", "customerId": "customerId", "employeeId": "employeeId"}, "createdAt", "read"),
    ],
    "customer-service": [
        Resource("Customer", "/api/admin/customers", "CustomerAdminService", "CustomerAdminController", [("lock", "inactive"), ("unlock", "active")], ["name"], {"status": "status"}, "createdAt"),
        Resource("Membership_rank", "/api/admin/customers/membership-ranks", "MembershipRankAdminService", "MembershipRankAdminController", [], ["rankName", "description"], {"status": "status"}),
        Resource("Product_review", "/api/admin/customers/reviews", "ProductReviewAdminService", "ProductReviewAdminController", [("hide", "inactive")], [], {"productId": "productId", "customerId": "customerId"}, "createdAt", "read"),
    ],
    "promotion-service": [
        Resource("Coupon", "/api/admin/promotions/coupons", "CouponAdminService", "CouponAdminController", [("active", "active"), ("inactive", "inactive")], ["code", "description"], {"status": "status", "applyFor": "applyFor", "discountType": "discountType"}),
    ],
    "content-service": [
        Resource("Banner", "/api/admin/content/banners", "BannerAdminService", "BannerAdminController", [("active", "active"), ("inactive", "inactive")], ["title", "subtitle"], {"status": "status"}, "createdAt"),
        Resource("News", "/api/admin/content/news", "NewsAdminService", "NewsAdminController", [("publish", "published"), ("archive", "archived")], ["title", "summary"], {"status": "status", "category": "category"}, "createdAt"),
    ],
}


PORTS = {
    "api-gateway": 4000,
    "auth-service": 8081,
    "user-service": 8082,
    "branch-service": 8083,
    "product-service": 8084,
    "inventory-service": 8085,
    "order-service": 8086,
    "customer-service": 8087,
    "promotion-service": 8088,
    "content-service": 8089,
    "report-service": 8090,
    "ai-service": 8091,
    "notification-service": 8092,
}


ALL_MODULES = [
    "coffee-common",
    "api-gateway",
    "auth-service",
    "user-service",
    "branch-service",
    "product-service",
    "inventory-service",
    "order-service",
    "customer-service",
    "promotion-service",
    "content-service",
    "report-service",
    "ai-service",
    "notification-service",
]


def imports_for_columns(columns: list[Column]) -> set[str]:
    imports: set[str] = {"jakarta.persistence.Column"}
    for col in columns:
        if col.primary:
            imports.add("jakarta.persistence.Id")
        if col.auto_increment:
            imports.add("jakarta.persistence.GeneratedValue")
            imports.add("jakarta.persistence.GenerationType")
        if col.text:
            imports.add("jakarta.persistence.Lob")
        if col.java_type == "LocalDate":
            imports.add("java.time.LocalDate")
        if col.java_type == "LocalTime":
            imports.add("java.time.LocalTime")
        if col.java_type == "LocalDateTime":
            imports.add("java.time.LocalDateTime")
        if col.java_type == "BigDecimal":
            imports.add("java.math.BigDecimal")
    return imports


def getter(field_name: str, java_type: str) -> str:
    prefix = "get"
    return f"{prefix}{field_name[:1].upper()}{field_name[1:]}"


def setter(field_name: str) -> str:
    return f"set{field_name[:1].upper()}{field_name[1:]}"


def generate_entity(module: str, table: Table) -> None:
    pkg = f"{GROUP_ID}.{package_name(module)}.entity"
    imports = {"jakarta.persistence.Entity", "jakarta.persistence.Table"}
    imports |= imports_for_columns(table.columns)
    if len(table.pk) > 1:
        imports.add("jakarta.persistence.IdClass")
    lines: list[str] = [f"package {pkg};", ""]
    for imp in sorted(imports):
        lines.append(f"import {imp};")
    lines.extend(["", "@Entity", f"@Table(name = \"{table.name}\")"])
    if len(table.pk) > 1:
        lines.append(f"@IdClass({table.class_name}Id.class)")
    lines.append(f"public class {table.class_name} " + "{")
    for col in table.columns:
        lines.append("")
        if col.primary:
            lines.append("    @Id")
        if col.auto_increment:
            lines.append("    @GeneratedValue(strategy = GenerationType.IDENTITY)")
        if col.text:
            lines.append("    @Lob")
        attrs = [f"name = \"{col.name}\""]
        if not col.nullable:
            attrs.append("nullable = false")
        if col.unique:
            attrs.append("unique = true")
        if col.length and col.java_type == "String":
            attrs.append(f"length = {col.length}")
        if col.text:
            attrs.append("columnDefinition = \"TEXT\"")
        lines.append(f"    @Column({', '.join(attrs)})")
        lines.append(f"    private {col.java_type} {col.field_name};")
    lines.extend(["", f"    public {table.class_name}() " + "{}", ""])
    for col in table.columns:
        method = getter(col.field_name, col.java_type)
        lines.append(f"    public {col.java_type} {method}() " + "{")
        lines.append(f"        return {col.field_name};")
        lines.append("    }")
        lines.append("")
        lines.append(f"    public void {setter(col.field_name)}({col.java_type} {col.field_name}) " + "{")
        lines.append(f"        this.{col.field_name} = {col.field_name};")
        lines.append("    }")
        lines.append("")
    lines.append("}")
    write(ROOT / module / "src/main/java" / pkg.replace(".", "/") / f"{table.class_name}.java", "\n".join(lines))

    if len(table.pk) > 1:
        id_imports = {"java.io.Serializable", "java.util.Objects"}
        for col in table.columns:
            if col.name in table.pk:
                if col.java_type == "LocalDate":
                    id_imports.add("java.time.LocalDate")
                if col.java_type == "LocalDateTime":
                    id_imports.add("java.time.LocalDateTime")
        id_lines = [f"package {pkg};", ""]
        for imp in sorted(id_imports):
            id_lines.append(f"import {imp};")
        id_lines.extend(["", f"public class {table.class_name}Id implements Serializable " + "{"])
        id_cols = [c for c in table.columns if c.name in table.pk]
        for col in id_cols:
            id_lines.append(f"    private {col.java_type} {col.field_name};")
        id_lines.extend(["", f"    public {table.class_name}Id() " + "{}", ""])
        for col in id_cols:
            id_lines.append(f"    public {col.java_type} {getter(col.field_name, col.java_type)}() " + "{")
            id_lines.append(f"        return {col.field_name};")
            id_lines.append("    }")
            id_lines.append("")
            id_lines.append(f"    public void {setter(col.field_name)}({col.java_type} {col.field_name}) " + "{")
            id_lines.append(f"        this.{col.field_name} = {col.field_name};")
            id_lines.append("    }")
            id_lines.append("")
        id_lines.append("    @Override")
        id_lines.append("    public boolean equals(Object o) {")
        id_lines.append("        if (this == o) return true;")
        id_lines.append("        if (o == null || getClass() != o.getClass()) return false;")
        id_lines.append(f"        {table.class_name}Id that = ({table.class_name}Id) o;")
        joined = " && ".join([f"Objects.equals({c.field_name}, that.{c.field_name})" for c in id_cols]) or "true"
        id_lines.append(f"        return {joined};")
        id_lines.append("    }")
        id_lines.append("")
        id_lines.append("    @Override")
        id_lines.append("    public int hashCode() {")
        id_lines.append("        return Objects.hash(" + ", ".join(c.field_name for c in id_cols) + ");")
        id_lines.append("    }")
        id_lines.append("}")
        write(ROOT / module / "src/main/java" / pkg.replace(".", "/") / f"{table.class_name}Id.java", "\n".join(id_lines))


def dto_columns(table: Table, response: bool) -> list[Column]:
    result: list[Column] = []
    for col in table.columns:
        if response and col.field_name.lower() == "password":
            continue
        if not response and col.auto_increment and col.primary:
            continue
        result.append(col)
    return result


def generate_dto(module: str, table: Table) -> None:
    base_pkg = f"{GROUP_ID}.{package_name(module)}.dto"
    for response in (False, True):
        cls = f"{table.class_name}{'Response' if response else 'Request'}"
        sub = "response" if response else "request"
        imports: set[str] = set()
        cols = dto_columns(table, response)
        if not response:
            for col in cols:
                if not col.nullable and not col.primary:
                    imports.add("jakarta.validation.constraints.NotNull")
                    if col.java_type == "String":
                        imports.add("jakarta.validation.constraints.NotBlank")
                if "email" in col.field_name.lower():
                    imports.add("jakarta.validation.constraints.Email")
                if col.java_type == "String" and col.length:
                    imports.add("jakarta.validation.constraints.Size")
        for col in cols:
            if col.java_type == "LocalDate":
                imports.add("java.time.LocalDate")
            if col.java_type == "LocalTime":
                imports.add("java.time.LocalTime")
            if col.java_type == "LocalDateTime":
                imports.add("java.time.LocalDateTime")
            if col.java_type == "BigDecimal":
                imports.add("java.math.BigDecimal")
        lines = [f"package {base_pkg}.{sub};", ""]
        for imp in sorted(imports):
            lines.append(f"import {imp};")
        if imports:
            lines.append("")
        lines.append(f"public class {cls} " + "{")
        for col in cols:
            lines.append("")
            if not response:
                if not col.nullable and not col.primary:
                    lines.append("    @NotBlank" if col.java_type == "String" else "    @NotNull")
                if "email" in col.field_name.lower():
                    lines.append("    @Email")
                if col.java_type == "String" and col.length:
                    lines.append(f"    @Size(max = {col.length})")
            lines.append(f"    private {col.java_type} {col.field_name};")
        lines.append("")
        for col in cols:
            lines.append(f"    public {col.java_type} {getter(col.field_name, col.java_type)}() " + "{")
            lines.append(f"        return {col.field_name};")
            lines.append("    }")
            lines.append("")
            lines.append(f"    public void {setter(col.field_name)}({col.java_type} {col.field_name}) " + "{")
            lines.append(f"        this.{col.field_name} = {col.field_name};")
            lines.append("    }")
            lines.append("")
        lines.append("}")
        write(ROOT / module / "src/main/java" / base_pkg.replace(".", "/") / sub / f"{cls}.java", "\n".join(lines))


def generate_mapper(module: str, table: Table) -> None:
    pkg = f"{GROUP_ID}.{package_name(module)}.mapper"
    epkg = f"{GROUP_ID}.{package_name(module)}.entity"
    req_pkg = f"{GROUP_ID}.{package_name(module)}.dto.request"
    res_pkg = f"{GROUP_ID}.{package_name(module)}.dto.response"
    lines = [
        f"package {pkg};",
        "",
        "import com.coffee.common.mapper.DtoMapper;",
        f"import {epkg}.{table.class_name};",
        f"import {req_pkg}.{table.class_name}Request;",
        f"import {res_pkg}.{table.class_name}Response;",
        "import org.springframework.stereotype.Component;",
        "",
        "@Component",
        f"public class {table.class_name}Mapper implements DtoMapper<{table.class_name}, {table.class_name}Request, {table.class_name}Response> " + "{",
        "    @Override",
        f"    public {table.class_name} toEntity({table.class_name}Request request) " + "{",
        f"        {table.class_name} entity = new {table.class_name}();",
        "        updateEntity(entity, request);",
        "        return entity;",
        "    }",
        "",
        "    @Override",
        f"    public void updateEntity({table.class_name} entity, {table.class_name}Request request) " + "{",
        "        if (request == null) {",
        "            return;",
        "        }",
    ]
    req_fields = {c.field_name for c in dto_columns(table, False)}
    for col in table.columns:
        if col.field_name in req_fields:
            lines.append(f"        entity.{setter(col.field_name)}(request.{getter(col.field_name, col.java_type)}());")
    lines.extend([
        "    }",
        "",
        "    @Override",
        f"    public {table.class_name}Response toResponse({table.class_name} entity) " + "{",
        "        if (entity == null) {",
        "            return null;",
        "        }",
        f"        {table.class_name}Response response = new {table.class_name}Response();",
    ])
    res_fields = {c.field_name for c in dto_columns(table, True)}
    for col in table.columns:
        if col.field_name in res_fields:
            lines.append(f"        response.{setter(col.field_name)}(entity.{getter(col.field_name, col.java_type)}());")
    lines.extend([
        "        return response;",
        "    }",
        "}",
    ])
    write(ROOT / module / "src/main/java" / pkg.replace(".", "/") / f"{table.class_name}Mapper.java", "\n".join(lines))


def generate_repository(module: str, table: Table) -> None:
    pkg = f"{GROUP_ID}.{package_name(module)}.repository"
    epkg = f"{GROUP_ID}.{package_name(module)}.entity"
    lines = [
        f"package {pkg};",
        "",
        f"import {epkg}.{table.class_name};",
    ]
    if len(table.pk) > 1:
        lines.append(f"import {epkg}.{table.class_name}Id;")
    lines.extend([
        "import java.util.Optional;",
        "import org.springframework.data.jpa.repository.JpaRepository;",
        "import org.springframework.data.jpa.repository.JpaSpecificationExecutor;",
        "import org.springframework.stereotype.Repository;",
        "",
        "@Repository",
        f"public interface {table.class_name}Repository extends JpaRepository<{table.class_name}, {table.id_type}>, JpaSpecificationExecutor<{table.class_name}> " + "{",
    ])
    method_fields = []
    for col in table.columns:
        if col.unique or col.field_name in {"email", "phoneNumber", "roleName", "branchName", "productName", "ingredientName", "supplierName", "code", "slug"}:
            method_fields.append(col)
    for col in method_fields:
        suffix = col.field_name[:1].upper() + col.field_name[1:]
        lines.append(f"    Optional<{table.class_name}> findBy{suffix}({col.java_type} {col.field_name});")
        lines.append(f"    boolean existsBy{suffix}({col.java_type} {col.field_name});")
    lines.append("}")
    write(ROOT / module / "src/main/java" / pkg.replace(".", "/") / f"{table.class_name}Repository.java", "\n".join(lines))


def generate_service(module: str, resource: Resource) -> None:
    table = SCHEMA[resource.entity]
    pkg = f"{GROUP_ID}.{package_name(module)}.service"
    impl_pkg = f"{pkg}.impl"
    mapper_pkg = f"{GROUP_ID}.{package_name(module)}.mapper"
    repo_pkg = f"{GROUP_ID}.{package_name(module)}.repository"
    entity_pkg = f"{GROUP_ID}.{package_name(module)}.entity"
    dto_req = f"{GROUP_ID}.{package_name(module)}.dto.request"
    dto_res = f"{GROUP_ID}.{package_name(module)}.dto.response"
    service_name = resource.service_name or f"{table.class_name}Service"
    lines = [
        f"package {pkg};",
        "",
        "import com.coffee.common.service.CrudService;",
        f"import {dto_req}.{table.class_name}Request;",
        f"import {dto_res}.{table.class_name}Response;",
        "",
        f"public interface {service_name} extends CrudService<{table.class_name}Request, {table.class_name}Response, {table.id_type}> " + "{",
        "}",
    ]
    write(ROOT / module / "src/main/java" / pkg.replace(".", "/") / f"{service_name}.java", "\n".join(lines))

    aliases = dict(resource.aliases)
    for alias in ["status", "branchId", "roleId", "categoryId", "rankId", "ingredientId", "supplierId", "productId", "customerId", "employeeId"]:
        if alias not in aliases:
            candidate = alias
            if any(c.field_name == candidate for c in table.columns):
                aliases[alias] = candidate
    keyword_fields = resource.keyword or [c.field_name for c in table.columns if c.java_type == "String" and c.field_name.lower() != "password"][:3]
    date_field = resource.date_field
    if not date_field:
        for candidate in ["createdAt", "updatedAt", "workDate", "startDate", "importedAt", "exportedAt"]:
            if any(c.field_name == candidate for c in table.columns):
                date_field = candidate
                break
    alias_src = ", ".join([f"\"{k}\", \"{v}\"" for k, v in aliases.items()])
    keyword_src = ", ".join([f"\"{v}\"" for v in keyword_fields])
    impl_lines = [
        f"package {impl_pkg};",
        "",
        "import com.coffee.common.service.CrudServiceSupport;",
        f"import {entity_pkg}.{table.class_name};",
        f"import {mapper_pkg}.{table.class_name}Mapper;",
        f"import {repo_pkg}.{table.class_name}Repository;",
        f"import {dto_req}.{table.class_name}Request;",
        f"import {dto_res}.{table.class_name}Response;",
        f"import {pkg}.{service_name};",
        "import java.util.List;",
        "import java.util.Map;",
        "import org.springframework.stereotype.Service;",
        "",
        "@Service",
        f"public class {service_name}Impl extends CrudServiceSupport<{table.class_name}, {table.id_type}, {table.class_name}Request, {table.class_name}Response> implements {service_name} " + "{",
        f"    public {service_name}Impl({table.class_name}Repository repository, {table.class_name}Mapper mapper) " + "{",
        f"        super(repository, repository, mapper, {table.class_name}.class, \"{table.pk[0] if table.pk else 'id'}\", List.of({keyword_src}), Map.of({alias_src}), " + (f"\"{date_field}\"" if date_field else "null") + ");",
        "    }",
        "}",
    ]
    write(ROOT / module / "src/main/java" / impl_pkg.replace(".", "/") / f"{service_name}Impl.java", "\n".join(impl_lines))


def generate_controller(module: str, resource: Resource) -> None:
    table = SCHEMA[resource.entity]
    if len(table.pk) > 1:
        return
    pkg = f"{GROUP_ID}.{package_name(module)}.controller"
    service_pkg = f"{GROUP_ID}.{package_name(module)}.service"
    dto_req = f"{GROUP_ID}.{package_name(module)}.dto.request"
    dto_res = f"{GROUP_ID}.{package_name(module)}.dto.response"
    service_name = resource.service_name or f"{table.class_name}Service"
    controller_name = resource.controller_name or f"{table.class_name}Controller"
    read_only = resource.methods == "read"
    lines = [
        f"package {pkg};",
        "",
        "import com.coffee.common.response.ApiResponse;",
        "import com.coffee.common.response.PageResponse;",
        f"import {dto_req}.{table.class_name}Request;",
        f"import {dto_res}.{table.class_name}Response;",
        f"import {service_pkg}.{service_name};",
        "import jakarta.validation.Valid;",
        "import java.util.HashMap;",
        "import java.util.Map;",
        "import org.springframework.data.domain.Pageable;",
        "import org.springframework.data.web.PageableDefault;",
        "import org.springframework.security.access.prepost.PreAuthorize;",
        "import org.springframework.validation.annotation.Validated;",
        "import org.springframework.web.bind.annotation.DeleteMapping;",
        "import org.springframework.web.bind.annotation.GetMapping;",
        "import org.springframework.web.bind.annotation.PatchMapping;",
        "import org.springframework.web.bind.annotation.PathVariable;",
        "import org.springframework.web.bind.annotation.PostMapping;",
        "import org.springframework.web.bind.annotation.PutMapping;",
        "import org.springframework.web.bind.annotation.RequestBody;",
        "import org.springframework.web.bind.annotation.RequestMapping;",
        "import org.springframework.web.bind.annotation.RequestParam;",
        "import org.springframework.web.bind.annotation.RestController;",
        "",
        "@Validated",
        "@RestController",
        f"@RequestMapping(\"{resource.path}\")",
        "@PreAuthorize(\"hasRole('admin')\")",
        f"public class {controller_name} " + "{",
        f"    private final {service_name} service;",
        "",
        f"    public {controller_name}({service_name} service) " + "{",
        "        this.service = service;",
        "    }",
        "",
        "    @GetMapping",
        f"    public ApiResponse<PageResponse<{table.class_name}Response>> list(@RequestParam Map<String, String> params, @PageableDefault(size = 10) Pageable pageable) " + "{",
        "        Map<String, String> filters = new HashMap<>(params);",
        "        String keyword = filters.remove(\"keyword\");",
        "        filters.remove(\"page\");",
        "        filters.remove(\"size\");",
        "        filters.remove(\"sort\");",
        "        return ApiResponse.success(service.list(keyword, filters, pageable));",
        "    }",
        "",
        "    @GetMapping(\"/{id}\")",
        f"    public ApiResponse<{table.class_name}Response> get(@PathVariable {table.id_type} id) " + "{",
        "        return ApiResponse.success(service.get(id));",
        "    }",
    ]
    if not read_only:
        lines.extend([
            "",
            "    @PostMapping",
            f"    public ApiResponse<{table.class_name}Response> create(@Valid @RequestBody {table.class_name}Request request) " + "{",
            "        return ApiResponse.success(\"Created\", service.create(request));",
            "    }",
            "",
            "    @PutMapping(\"/{id}\")",
            f"    public ApiResponse<{table.class_name}Response> update(@PathVariable {table.id_type} id, @Valid @RequestBody {table.class_name}Request request) " + "{",
            "        return ApiResponse.success(\"Updated\", service.update(id, request));",
            "    }",
        ])
    for action, status in resource.actions:
        lines.extend([
            "",
            f"    @PatchMapping(\"/{{id}}/{action}\")",
            f"    public ApiResponse<{table.class_name}Response> {camel(action)}(@PathVariable {table.id_type} id) " + "{",
            f"        return ApiResponse.success(\"Status updated\", service.setStatus(id, \"{status}\"));",
            "    }",
        ])
    if not read_only:
        lines.extend([
            "",
            "    @DeleteMapping(\"/{id}\")",
            f"    public ApiResponse<Void> delete(@PathVariable {table.id_type} id) " + "{",
            "        service.delete(id);",
            "        return ApiResponse.success(\"Deleted\", null);",
            "    }",
        ])
    lines.append("}")
    write(ROOT / module / "src/main/java" / pkg.replace(".", "/") / f"{controller_name}.java", "\n".join(lines))


def pom_parent() -> str:
    modules = "\n".join(f"        <module>{m}</module>" for m in ALL_MODULES)
    return f"""
    <?xml version="1.0" encoding="UTF-8"?>
    <project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
        <modelVersion>4.0.0</modelVersion>
        <parent>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-parent</artifactId>
            <version>{BOOT_VERSION}</version>
            <relativePath/>
        </parent>
        <groupId>{GROUP_ID}</groupId>
        <artifactId>coffee-chain-backend</artifactId>
        <version>1.0.0</version>
        <packaging>pom</packaging>
        <name>Coffee Chain Backend</name>
        <description>Microservice backend for coffee chain admin management</description>

        <modules>
{modules}
        </modules>

        <properties>
            <java.version>17</java.version>
            <springdoc.version>{SPRINGDOC_VERSION}</springdoc.version>
            <jjwt.version>{JJWT_VERSION}</jjwt.version>
            <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        </properties>

        <dependencyManagement>
            <dependencies>
                <dependency>
                    <groupId>org.springdoc</groupId>
                    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
                    <version>${{springdoc.version}}</version>
                </dependency>
                <dependency>
                    <groupId>io.jsonwebtoken</groupId>
                    <artifactId>jjwt-api</artifactId>
                    <version>${{jjwt.version}}</version>
                </dependency>
                <dependency>
                    <groupId>io.jsonwebtoken</groupId>
                    <artifactId>jjwt-impl</artifactId>
                    <version>${{jjwt.version}}</version>
                </dependency>
                <dependency>
                    <groupId>io.jsonwebtoken</groupId>
                    <artifactId>jjwt-jackson</artifactId>
                    <version>${{jjwt.version}}</version>
                </dependency>
            </dependencies>
        </dependencyManagement>
    </project>
    """


def pom_common() -> str:
    return """
    <?xml version="1.0" encoding="UTF-8"?>
    <project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
        <modelVersion>4.0.0</modelVersion>
        <parent>
            <groupId>com.coffee</groupId>
            <artifactId>coffee-chain-backend</artifactId>
            <version>1.0.0</version>
        </parent>
        <artifactId>coffee-common</artifactId>
        <packaging>jar</packaging>

        <dependencies>
            <dependency>
                <groupId>org.springframework</groupId>
                <artifactId>spring-web</artifactId>
            </dependency>
            <dependency>
                <groupId>org.springframework</groupId>
                <artifactId>spring-webmvc</artifactId>
            </dependency>
            <dependency>
                <groupId>org.springframework.security</groupId>
                <artifactId>spring-security-core</artifactId>
            </dependency>
            <dependency>
                <groupId>org.springframework.security</groupId>
                <artifactId>spring-security-web</artifactId>
            </dependency>
            <dependency>
                <groupId>org.springframework.data</groupId>
                <artifactId>spring-data-jpa</artifactId>
            </dependency>
            <dependency>
                <groupId>jakarta.persistence</groupId>
                <artifactId>jakarta.persistence-api</artifactId>
            </dependency>
            <dependency>
                <groupId>jakarta.servlet</groupId>
                <artifactId>jakarta.servlet-api</artifactId>
            </dependency>
            <dependency>
                <groupId>jakarta.validation</groupId>
                <artifactId>jakarta.validation-api</artifactId>
            </dependency>
            <dependency>
                <groupId>com.fasterxml.jackson.core</groupId>
                <artifactId>jackson-databind</artifactId>
            </dependency>
            <dependency>
                <groupId>io.jsonwebtoken</groupId>
                <artifactId>jjwt-api</artifactId>
            </dependency>
            <dependency>
                <groupId>io.jsonwebtoken</groupId>
                <artifactId>jjwt-impl</artifactId>
                <scope>runtime</scope>
            </dependency>
            <dependency>
                <groupId>io.jsonwebtoken</groupId>
                <artifactId>jjwt-jackson</artifactId>
                <scope>runtime</scope>
            </dependency>
        </dependencies>
    </project>
    """


def pom_service(module: str, db: bool = True, jdbc: bool = False) -> str:
    deps = [
        """
            <dependency>
                <groupId>com.coffee</groupId>
                <artifactId>coffee-common</artifactId>
                <version>${project.version}</version>
            </dependency>
        """,
        """
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-starter-web</artifactId>
            </dependency>
        """,
        """
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-starter-security</artifactId>
            </dependency>
        """,
        """
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-starter-validation</artifactId>
            </dependency>
        """,
        """
            <dependency>
                <groupId>org.springdoc</groupId>
                <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
            </dependency>
        """,
        """
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-starter-test</artifactId>
                <scope>test</scope>
            </dependency>
        """,
    ]
    if db:
        deps.extend([
            """
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-starter-data-jpa</artifactId>
            </dependency>
            """,
            """
            <dependency>
                <groupId>org.postgresql</groupId>
                <artifactId>postgresql</artifactId>
                <scope>runtime</scope>
            </dependency>
            """,
        ])
    if jdbc and not db:
        deps.append(
            """
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-starter-jdbc</artifactId>
            </dependency>
            """
        )
    deps_txt = "\n".join(textwrap.dedent(dep).rstrip() for dep in deps)
    return f"""
    <?xml version="1.0" encoding="UTF-8"?>
    <project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
        <modelVersion>4.0.0</modelVersion>
        <parent>
            <groupId>com.coffee</groupId>
            <artifactId>coffee-chain-backend</artifactId>
            <version>1.0.0</version>
        </parent>
        <artifactId>{module}</artifactId>

        <dependencies>
{deps_txt}
        </dependencies>

        <build>
            <plugins>
                <plugin>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-maven-plugin</artifactId>
                </plugin>
            </plugins>
        </build>
    </project>
    """


def application_yml(module: str, db: bool = True) -> str:
    port = PORTS[module]
    datasource = ""
    jpa = ""
    if db:
        datasource = """
      datasource:
        url: ${DB_URL:jdbc:postgresql://localhost:5432/do_an_lien_nganh}
        username: ${DB_USERNAME:root}
        password: ${DB_PASSWORD:}
        driver-class-name: org.postgresql.Driver
        hikari:
          maximum-pool-size: 10
    """
        jpa = """
      jpa:
        open-in-view: false
        hibernate:
          ddl-auto: none
        properties:
          hibernate:
            format_sql: false
            dialect: org.hibernate.dialect.PostgreSQLDialect
    """
    return f"""
    server:
      port: {port}

    spring:
      application:
        name: {module}
{datasource.rstrip()}
{jpa.rstrip()}

    app:
      cors:
        allowed-origins: ${{CORS_ALLOWED_ORIGINS:http://localhost:5173,http://localhost:3000,http://localhost:4000}}
      jwt:
        secret: ${{JWT_SECRET:coffee-chain-management-secret-key-change-me-in-production-2026}}
        access-token-minutes: ${{JWT_ACCESS_TOKEN_MINUTES:120}}
        refresh-token-days: ${{JWT_REFRESH_TOKEN_DAYS:7}}

    springdoc:
      swagger-ui:
        path: /swagger-ui.html
      api-docs:
        path: /v3/api-docs
    """


def generate_common() -> None:
    module = ROOT / "coffee-common"
    write(module / "pom.xml", pom_common())
    base = module / "src/main/java/com/coffee/common"
    write(base / "response/ApiResponse.java", """
    package com.coffee.common.response;

    import java.time.LocalDateTime;

    public class ApiResponse<T> {
        private boolean success;
        private String message;
        private T data;
        private Object errors;
        private LocalDateTime timestamp;

        public ApiResponse() {
            this.timestamp = LocalDateTime.now();
        }

        public ApiResponse(boolean success, String message, T data, Object errors) {
            this.success = success;
            this.message = message;
            this.data = data;
            this.errors = errors;
            this.timestamp = LocalDateTime.now();
        }

        public static <T> ApiResponse<T> success(T data) {
            return new ApiResponse<>(true, "Success", data, null);
        }

        public static <T> ApiResponse<T> success(String message, T data) {
            return new ApiResponse<>(true, message, data, null);
        }

        public static <T> ApiResponse<T> error(String message, Object errors) {
            return new ApiResponse<>(false, message, null, errors);
        }

        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public T getData() { return data; }
        public void setData(T data) { this.data = data; }
        public Object getErrors() { return errors; }
        public void setErrors(Object errors) { this.errors = errors; }
        public LocalDateTime getTimestamp() { return timestamp; }
        public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    }
    """)
    write(base / "response/ErrorDetail.java", """
    package com.coffee.common.response;

    public class ErrorDetail {
        private String field;
        private String message;

        public ErrorDetail() {}

        public ErrorDetail(String field, String message) {
            this.field = field;
            this.message = message;
        }

        public String getField() { return field; }
        public void setField(String field) { this.field = field; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }
    """)
    write(base / "response/PageResponse.java", """
    package com.coffee.common.response;

    import java.util.List;
    import org.springframework.data.domain.Page;

    public class PageResponse<T> {
        private List<T> items;
        private int page;
        private int size;
        private long totalElements;
        private int totalPages;

        public PageResponse() {}

        public PageResponse(List<T> items, int page, int size, long totalElements, int totalPages) {
            this.items = items;
            this.page = page;
            this.size = size;
            this.totalElements = totalElements;
            this.totalPages = totalPages;
        }

        public static <T> PageResponse<T> from(Page<T> page) {
            return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
        }

        public List<T> getItems() { return items; }
        public void setItems(List<T> items) { this.items = items; }
        public int getPage() { return page; }
        public void setPage(int page) { this.page = page; }
        public int getSize() { return size; }
        public void setSize(int size) { this.size = size; }
        public long getTotalElements() { return totalElements; }
        public void setTotalElements(long totalElements) { this.totalElements = totalElements; }
        public int getTotalPages() { return totalPages; }
        public void setTotalPages(int totalPages) { this.totalPages = totalPages; }
    }
    """)
    for exc in ["ResourceNotFoundException", "BadRequestException", "DuplicateResourceException", "UnauthorizedException", "ForbiddenException"]:
        write(base / f"exception/{exc}.java", f"""
        package com.coffee.common.exception;

        public class {exc} extends RuntimeException {{
            public {exc}(String message) {{
                super(message);
            }}
        }}
        """)
    write(base / "exception/BaseGlobalExceptionHandler.java", """
    package com.coffee.common.exception;

    import com.coffee.common.response.ApiResponse;
    import com.coffee.common.response.ErrorDetail;
    import jakarta.validation.ConstraintViolationException;
    import java.util.List;
    import org.springframework.http.HttpStatus;
    import org.springframework.http.ResponseEntity;
    import org.springframework.security.access.AccessDeniedException;
    import org.springframework.web.bind.MethodArgumentNotValidException;
    import org.springframework.web.bind.annotation.ExceptionHandler;

    public class BaseGlobalExceptionHandler {
        @ExceptionHandler(ResourceNotFoundException.class)
        public ResponseEntity<ApiResponse<Void>> notFound(ResourceNotFoundException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(ex.getMessage(), null));
        }

        @ExceptionHandler({BadRequestException.class, DuplicateResourceException.class})
        public ResponseEntity<ApiResponse<Void>> badRequest(RuntimeException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage(), null));
        }

        @ExceptionHandler(UnauthorizedException.class)
        public ResponseEntity<ApiResponse<Void>> unauthorized(UnauthorizedException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error(ex.getMessage(), null));
        }

        @ExceptionHandler({ForbiddenException.class, AccessDeniedException.class})
        public ResponseEntity<ApiResponse<Void>> forbidden(Exception ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(ex.getMessage(), null));
        }

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ApiResponse<Void>> validation(MethodArgumentNotValidException ex) {
            List<ErrorDetail> errors = ex.getBindingResult().getFieldErrors().stream()
                    .map(err -> new ErrorDetail(err.getField(), err.getDefaultMessage()))
                    .toList();
            return ResponseEntity.badRequest().body(ApiResponse.error("Validation failed", errors));
        }

        @ExceptionHandler(ConstraintViolationException.class)
        public ResponseEntity<ApiResponse<Void>> constraint(ConstraintViolationException ex) {
            List<ErrorDetail> errors = ex.getConstraintViolations().stream()
                    .map(err -> new ErrorDetail(err.getPropertyPath().toString(), err.getMessage()))
                    .toList();
            return ResponseEntity.badRequest().body(ApiResponse.error("Validation failed", errors));
        }

        @ExceptionHandler(Exception.class)
        public ResponseEntity<ApiResponse<Void>> general(Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(ex.getMessage(), null));
        }
    }
    """)
    write(base / "mapper/DtoMapper.java", """
    package com.coffee.common.mapper;

    public interface DtoMapper<E, REQ, RESP> {
        E toEntity(REQ request);
        void updateEntity(E entity, REQ request);
        RESP toResponse(E entity);
    }
    """)
    write(base / "service/CrudService.java", """
    package com.coffee.common.service;

    import com.coffee.common.response.PageResponse;
    import java.util.Map;
    import org.springframework.data.domain.Pageable;

    public interface CrudService<REQ, RESP, ID> {
        PageResponse<RESP> list(String keyword, Map<String, String> filters, Pageable pageable);
        RESP get(ID id);
        RESP create(REQ request);
        RESP update(ID id, REQ request);
        void delete(ID id);
        RESP setStatus(ID id, String status);
    }
    """)
    write(base / "service/CrudServiceSupport.java", """
    package com.coffee.common.service;

    import com.coffee.common.exception.BadRequestException;
    import com.coffee.common.exception.ResourceNotFoundException;
    import com.coffee.common.mapper.DtoMapper;
    import com.coffee.common.response.PageResponse;
    import jakarta.persistence.criteria.Predicate;
    import java.lang.reflect.Field;
    import java.time.LocalDate;
    import java.time.LocalDateTime;
    import java.time.LocalTime;
    import java.util.ArrayList;
    import java.util.List;
    import java.util.Map;
    import org.springframework.data.domain.Page;
    import org.springframework.data.domain.Pageable;
    import org.springframework.data.jpa.domain.Specification;
    import org.springframework.data.jpa.repository.JpaRepository;
    import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

    public abstract class CrudServiceSupport<E, ID, REQ, RESP> implements CrudService<REQ, RESP, ID> {
        private final JpaRepository<E, ID> repository;
        private final JpaSpecificationExecutor<E> specifications;
        private final DtoMapper<E, REQ, RESP> mapper;
        private final Class<E> entityClass;
        private final String idLabel;
        private final List<String> keywordFields;
        private final Map<String, String> filterAliases;
        private final String dateField;

        protected CrudServiceSupport(
                JpaRepository<E, ID> repository,
                JpaSpecificationExecutor<E> specifications,
                DtoMapper<E, REQ, RESP> mapper,
                Class<E> entityClass,
                String idLabel,
                List<String> keywordFields,
                Map<String, String> filterAliases,
                String dateField
        ) {
            this.repository = repository;
            this.specifications = specifications;
            this.mapper = mapper;
            this.entityClass = entityClass;
            this.idLabel = idLabel;
            this.keywordFields = keywordFields;
            this.filterAliases = filterAliases;
            this.dateField = dateField;
        }

        @Override
        public PageResponse<RESP> list(String keyword, Map<String, String> filters, Pageable pageable) {
            Page<RESP> page = specifications.findAll(buildSpec(keyword, filters), pageable).map(mapper::toResponse);
            return PageResponse.from(page);
        }

        @Override
        public RESP get(ID id) {
            return mapper.toResponse(find(id));
        }

        @Override
        public RESP create(REQ request) {
            E entity = mapper.toEntity(request);
            return mapper.toResponse(repository.save(entity));
        }

        @Override
        public RESP update(ID id, REQ request) {
            E entity = find(id);
            mapper.updateEntity(entity, request);
            return mapper.toResponse(repository.save(entity));
        }

        @Override
        public void delete(ID id) {
            E entity = find(id);
            if (hasField("status")) {
                setField(entity, "status", "inactive");
                repository.save(entity);
            } else {
                repository.delete(entity);
            }
        }

        @Override
        public RESP setStatus(ID id, String status) {
            E entity = find(id);
            if (!hasField("status")) {
                throw new BadRequestException("This resource does not support status changes");
            }
            setField(entity, "status", status);
            return mapper.toResponse(repository.save(entity));
        }

        protected E find(ID id) {
            return repository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException(entityClass.getSimpleName() + " not found: " + idLabel + "=" + id));
        }

        private Specification<E> buildSpec(String keyword, Map<String, String> filters) {
            return (root, query, cb) -> {
                List<Predicate> predicates = new ArrayList<>();
                if (keyword != null && !keyword.isBlank() && !keywordFields.isEmpty()) {
                    String like = "%" + keyword.toLowerCase() + "%";
                    List<Predicate> ors = new ArrayList<>();
                    for (String field : keywordFields) {
                        if (hasField(field)) {
                            ors.add(cb.like(cb.lower(root.get(field).as(String.class)), like));
                        }
                    }
                    if (!ors.isEmpty()) {
                        predicates.add(cb.or(ors.toArray(Predicate[]::new)));
                    }
                }

                filters.forEach((key, value) -> {
                    if (value == null || value.isBlank() || "all".equalsIgnoreCase(value)) {
                        return;
                    }
                    if ("fromDate".equals(key) || "toDate".equals(key)) {
                        return;
                    }
                    String field = filterAliases.getOrDefault(key, key);
                    if (!hasField(field)) {
                        return;
                    }
                    predicates.add(cb.equal(root.get(field), convertValue(field, value)));
                });

                if (dateField != null && hasField(dateField)) {
                    String from = filters.get("fromDate");
                    String to = filters.get("toDate");
                    if (from != null && !from.isBlank()) {
                        predicates.add(cb.greaterThanOrEqualTo(root.get(dateField), convertDateValue(dateField, from, true)));
                    }
                    if (to != null && !to.isBlank()) {
                        predicates.add(cb.lessThanOrEqualTo(root.get(dateField), convertDateValue(dateField, to, false)));
                    }
                }
                return cb.and(predicates.toArray(Predicate[]::new));
            };
        }

        @SuppressWarnings({"unchecked", "rawtypes"})
        private Comparable convertDateValue(String fieldName, String value, boolean startOfDay) {
            Class<?> type = fieldType(fieldName);
            LocalDate date = LocalDate.parse(value);
            if (LocalDateTime.class.equals(type)) {
                return startOfDay ? date.atStartOfDay() : date.atTime(LocalTime.MAX);
            }
            return date;
        }

        private Object convertValue(String fieldName, String value) {
            Class<?> type = fieldType(fieldName);
            if (Long.class.equals(type)) return Long.valueOf(value);
            if (Integer.class.equals(type)) return Integer.valueOf(value);
            if (Double.class.equals(type)) return Double.valueOf(value);
            if (Boolean.class.equals(type)) return Boolean.valueOf(value);
            if (LocalDate.class.equals(type)) return LocalDate.parse(value);
            if (LocalDateTime.class.equals(type)) return LocalDate.parse(value).atStartOfDay();
            return value;
        }

        private boolean hasField(String fieldName) {
            try {
                entityClass.getDeclaredField(fieldName);
                return true;
            } catch (NoSuchFieldException ex) {
                return false;
            }
        }

        private Class<?> fieldType(String fieldName) {
            try {
                return entityClass.getDeclaredField(fieldName).getType();
            } catch (NoSuchFieldException ex) {
                return String.class;
            }
        }

        private void setField(E entity, String fieldName, Object value) {
            try {
                Field field = entityClass.getDeclaredField(fieldName);
                field.setAccessible(true);
                field.set(entity, value);
            } catch (ReflectiveOperationException ex) {
                throw new BadRequestException("Cannot update field " + fieldName);
            }
        }
    }
    """)
    write(base / "security/JwtService.java", """
    package com.coffee.common.security;

    import io.jsonwebtoken.Claims;
    import io.jsonwebtoken.Jwts;
    import io.jsonwebtoken.SignatureAlgorithm;
    import io.jsonwebtoken.security.Keys;
    import java.nio.charset.StandardCharsets;
    import java.security.Key;
    import java.time.Duration;
    import java.time.Instant;
    import java.util.Arrays;
    import java.util.Date;
    import java.util.HashMap;
    import java.util.Map;
    import org.springframework.beans.factory.annotation.Value;
    import org.springframework.stereotype.Component;

    @Component
    public class JwtService {
        private final String secret;
        private final long accessTokenMinutes;

        public JwtService(
                @Value("${app.jwt.secret}") String secret,
                @Value("${app.jwt.access-token-minutes:120}") long accessTokenMinutes
        ) {
            this.secret = secret;
            this.accessTokenMinutes = accessTokenMinutes;
        }

        public String generateAccessToken(Long userId, String roleName, Long branchId) {
            Map<String, Object> claims = new HashMap<>();
            claims.put("userId", userId);
            claims.put("roleName", roleName);
            claims.put("branchId", branchId);
            Instant now = Instant.now();
            return Jwts.builder()
                    .setClaims(claims)
                    .setSubject(String.valueOf(userId))
                    .setIssuedAt(Date.from(now))
                    .setExpiration(Date.from(now.plus(Duration.ofMinutes(accessTokenMinutes))))
                    .signWith(key(), SignatureAlgorithm.HS256)
                    .compact();
        }

        public Claims parse(String token) {
            return Jwts.parserBuilder().setSigningKey(key()).build().parseClaimsJws(token).getBody();
        }

        private Key key() {
            byte[] bytes = Arrays.copyOf(secret.getBytes(StandardCharsets.UTF_8), 64);
            return Keys.hmacShaKeyFor(bytes);
        }
    }
    """)
    write(base / "security/JwtAuthenticationFilter.java", """
    package com.coffee.common.security;

    import com.coffee.common.response.ApiResponse;
    import com.fasterxml.jackson.databind.ObjectMapper;
    import io.jsonwebtoken.Claims;
    import jakarta.servlet.FilterChain;
    import jakarta.servlet.ServletException;
    import jakarta.servlet.http.HttpServletRequest;
    import jakarta.servlet.http.HttpServletResponse;
    import java.io.IOException;
    import java.util.List;
    import org.springframework.http.MediaType;
    import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
    import org.springframework.security.core.authority.SimpleGrantedAuthority;
    import org.springframework.security.core.context.SecurityContextHolder;
    import org.springframework.stereotype.Component;
    import org.springframework.web.filter.OncePerRequestFilter;

    @Component
    public class JwtAuthenticationFilter extends OncePerRequestFilter {
        private final JwtService jwtService;
        private final ObjectMapper objectMapper;

        public JwtAuthenticationFilter(JwtService jwtService, ObjectMapper objectMapper) {
            this.jwtService = jwtService;
            this.objectMapper = objectMapper;
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                throws ServletException, IOException {
            String header = request.getHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) {
                filterChain.doFilter(request, response);
                return;
            }
            try {
                Claims claims = jwtService.parse(header.substring(7));
                String roleName = String.valueOf(claims.get("roleName"));
                Long userId = Long.valueOf(String.valueOf(claims.get("userId")));
                Long branchId = claims.get("branchId") == null ? null : Long.valueOf(String.valueOf(claims.get("branchId")));
                AuthenticatedUser principal = new AuthenticatedUser(userId, roleName, branchId);
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + roleName))
                );
                SecurityContextHolder.getContext().setAuthentication(authentication);
                filterChain.doFilter(request, response);
            } catch (Exception ex) {
                SecurityContextHolder.clearContext();
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                objectMapper.writeValue(response.getWriter(), ApiResponse.error("Invalid or expired token", null));
            }
        }
    }
    """)
    write(base / "security/AuthenticatedUser.java", """
    package com.coffee.common.security;

    public class AuthenticatedUser {
        private final Long userId;
        private final String roleName;
        private final Long branchId;

        public AuthenticatedUser(Long userId, String roleName, Long branchId) {
            this.userId = userId;
            this.roleName = roleName;
            this.branchId = branchId;
        }

        public Long getUserId() { return userId; }
        public String getRoleName() { return roleName; }
        public Long getBranchId() { return branchId; }
    }
    """)
    write(base / "util/SlugUtil.java", """
    package com.coffee.common.util;

    import java.text.Normalizer;
    import java.util.Locale;

    public final class SlugUtil {
        private SlugUtil() {}

        public static String slugify(String value) {
            if (value == null || value.isBlank()) {
                return "untitled";
            }
            String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                    .replaceAll("\\\\p{M}", "")
                    .toLowerCase(Locale.ROOT)
                    .replaceAll("[^a-z0-9]+", "-")
                    .replaceAll("(^-|-$)", "");
            return normalized.isBlank() ? "untitled" : normalized;
        }
    }
    """)


def generate_config(module: str, auth_service: bool = False, gateway: bool = False, db: bool = True) -> None:
    pkg = f"{GROUP_ID}.{package_name(module)}"
    base = ROOT / module / "src/main/java" / pkg.replace(".", "/")
    app_cls = pascal(module) + "Application"
    write(base / f"{app_cls}.java", f"""
    package {pkg};

    import org.springframework.boot.SpringApplication;
    import org.springframework.boot.autoconfigure.SpringBootApplication;
    import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

    @EnableMethodSecurity
    @SpringBootApplication(scanBasePackages = {{"com.coffee.common", "{pkg}"}})
    public class {app_cls} {{
        public static void main(String[] args) {{
            SpringApplication.run({app_cls}.class, args);
        }}
    }}
    """)
    write(base / "exception/GlobalExceptionHandler.java", f"""
    package {pkg}.exception;

    import com.coffee.common.exception.BaseGlobalExceptionHandler;
    import org.springframework.web.bind.annotation.RestControllerAdvice;

    @RestControllerAdvice
    public class GlobalExceptionHandler extends BaseGlobalExceptionHandler {{
    }}
    """)
    write(base / "config/OpenApiConfig.java", f"""
    package {pkg}.config;

    import io.swagger.v3.oas.models.OpenAPI;
    import io.swagger.v3.oas.models.info.Info;
    import org.springframework.context.annotation.Bean;
    import org.springframework.context.annotation.Configuration;

    @Configuration
    public class OpenApiConfig {{
        @Bean
        public OpenAPI openAPI() {{
            return new OpenAPI().info(new Info().title("{module} API").version("1.0.0"));
        }}
    }}
    """)
    write(base / "config/CorsConfig.java", f"""
    package {pkg}.config;

    import java.util.Arrays;
    import org.springframework.beans.factory.annotation.Value;
    import org.springframework.context.annotation.Configuration;
    import org.springframework.web.servlet.config.annotation.CorsRegistry;
    import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

    @Configuration
    public class CorsConfig implements WebMvcConfigurer {{
        @Value("${{app.cors.allowed-origins:*}}")
        private String allowedOrigins;

        @Override
        public void addCorsMappings(CorsRegistry registry) {{
            registry.addMapping("/**")
                    .allowedOrigins(Arrays.stream(allowedOrigins.split(",")).map(String::trim).toArray(String[]::new))
                    .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                    .allowedHeaders("*")
                    .allowCredentials(false)
                    .maxAge(3600);
        }}
    }}
    """)
    if not db and module == "notification-service":
        public_matchers = '"/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/actuator/health", "/internal/**"'
    elif auth_service:
        public_matchers = '"/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/actuator/health", "/api/auth/login", "/api/auth/forgot-password", "/api/auth/verify-otp", "/api/auth/reset-password", "/api/auth/refresh-token"'
    elif gateway:
        public_matchers = '"/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/actuator/health", "/api/auth/login", "/api/auth/forgot-password", "/api/auth/verify-otp", "/api/auth/reset-password", "/api/auth/refresh-token"'
    else:
        public_matchers = '"/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/actuator/health"'
    write(base / "security/SecurityConfig.java", f"""
    package {pkg}.security;

    import com.coffee.common.security.JwtAuthenticationFilter;
    import org.springframework.context.annotation.Bean;
    import org.springframework.context.annotation.Configuration;
    import org.springframework.security.config.annotation.web.builders.HttpSecurity;
    import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
    import org.springframework.security.config.http.SessionCreationPolicy;
    import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
    import org.springframework.security.crypto.password.PasswordEncoder;
    import org.springframework.security.web.SecurityFilterChain;
    import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

    @Configuration
    @EnableWebSecurity
    public class SecurityConfig {{
        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {{
            http.csrf(csrf -> csrf.disable())
                    .cors(cors -> {{}})
                    .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                    .authorizeHttpRequests(auth -> auth
                            .requestMatchers({public_matchers}).permitAll()
                            .anyRequest().authenticated())
                    .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
            return http.build();
        }}

        @Bean
        public PasswordEncoder passwordEncoder() {{
            return new BCryptPasswordEncoder();
        }}
    }}
    """)
    write(ROOT / module / "src/main/resources/application.yml", application_yml(module, db=db))


def generate_module_scaffold(module: str) -> None:
    db = module not in {"api-gateway", "notification-service"}
    write(ROOT / module / "pom.xml", pom_service(module, db=db))
    generate_config(module, auth_service=(module == "auth-service"), gateway=(module == "api-gateway"), db=db)
    for dirname in ["controller", "service", "service/impl", "repository", "entity", "dto/request", "dto/response", "mapper", "exception", "security", "config", "common"]:
        (ROOT / module / "src/main/java" / f"{GROUP_ID}.{package_name(module)}".replace(".", "/") / dirname).mkdir(parents=True, exist_ok=True)


def generate_entities_for_service(module: str) -> None:
    for table_name in SERVICE_TABLES.get(module, []):
        table = SCHEMA[table_name]
        generate_entity(module, table)
        generate_dto(module, table)
        generate_mapper(module, table)
        generate_repository(module, table)


def generate_crud_for_service(module: str) -> None:
    for resource in RESOURCES.get(module, []):
        generate_service(module, resource)
        generate_controller(module, resource)


def generate_gateway() -> None:
    module = "api-gateway"
    write(ROOT / module / "pom.xml", pom_service(module, db=False))
    generate_config(module, gateway=True, db=False)
    pkg = f"{GROUP_ID}.{package_name(module)}"
    base = ROOT / module / "src/main/java" / pkg.replace(".", "/")
    write(ROOT / module / "src/main/resources/application.yml", f"""
    server:
      port: {PORTS[module]}

    spring:
      application:
        name: api-gateway

    app:
      cors:
        allowed-origins: ${{CORS_ALLOWED_ORIGINS:http://localhost:5173,http://localhost:3000,http://localhost:4000}}
      jwt:
        secret: ${{JWT_SECRET:coffee-chain-management-secret-key-change-me-in-production-2026}}
        access-token-minutes: ${{JWT_ACCESS_TOKEN_MINUTES:120}}
      routes:
        auth-service: ${{AUTH_SERVICE_URL:http://localhost:8081}}
        user-service: ${{USER_SERVICE_URL:http://localhost:8082}}
        branch-service: ${{BRANCH_SERVICE_URL:http://localhost:8083}}
        product-service: ${{PRODUCT_SERVICE_URL:http://localhost:8084}}
        inventory-service: ${{INVENTORY_SERVICE_URL:http://localhost:8085}}
        order-service: ${{ORDER_SERVICE_URL:http://localhost:8086}}
        customer-service: ${{CUSTOMER_SERVICE_URL:http://localhost:8087}}
        promotion-service: ${{PROMOTION_SERVICE_URL:http://localhost:8088}}
        content-service: ${{CONTENT_SERVICE_URL:http://localhost:8089}}
        report-service: ${{REPORT_SERVICE_URL:http://localhost:8090}}
        ai-service: ${{AI_SERVICE_URL:http://localhost:8091}}

    springdoc:
      swagger-ui:
        path: /swagger-ui.html
      api-docs:
        path: /v3/api-docs
    """)
    write(base / "config/RouteProperties.java", f"""
    package {pkg}.config;

    import java.util.HashMap;
    import java.util.Map;
    import org.springframework.boot.context.properties.ConfigurationProperties;
    import org.springframework.context.annotation.Configuration;

    @Configuration
    @ConfigurationProperties(prefix = "app")
    public class RouteProperties {{
        private Map<String, String> routes = new HashMap<>();

        public Map<String, String> getRoutes() {{
            return routes;
        }}

        public void setRoutes(Map<String, String> routes) {{
            this.routes = routes;
        }}
    }}
    """)
    write(base / "controller/GatewayProxyController.java", f"""
    package {pkg}.controller;

    import com.coffee.common.exception.BadRequestException;
    import com.coffee.common.response.ApiResponse;
    import {pkg}.config.RouteProperties;
    import jakarta.servlet.http.HttpServletRequest;
    import java.net.URI;
    import java.util.Collections;
    import org.springframework.http.HttpEntity;
    import org.springframework.http.HttpHeaders;
    import org.springframework.http.HttpMethod;
    import org.springframework.http.ResponseEntity;
    import org.springframework.web.bind.annotation.RequestBody;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;
    import org.springframework.web.client.RestTemplate;
    import org.springframework.web.util.UriComponentsBuilder;

    @RestController
    public class GatewayProxyController {{
        private final RouteProperties routeProperties;
        private final RestTemplate restTemplate = new RestTemplate();

        public GatewayProxyController(RouteProperties routeProperties) {{
            this.routeProperties = routeProperties;
        }}

        @RequestMapping("/api/**")
        public ResponseEntity<?> proxy(HttpServletRequest request, @RequestBody(required = false) byte[] body) {{
            String service = resolveService(request.getRequestURI());
            String baseUrl = routeProperties.getRoutes().get(service);
            if (baseUrl == null) {{
                throw new BadRequestException("No route configured for " + service);
            }}
            URI uri = UriComponentsBuilder.fromHttpUrl(baseUrl)
                    .path(request.getRequestURI())
                    .query(request.getQueryString())
                    .build(true)
                    .toUri();
            HttpHeaders headers = new HttpHeaders();
            Collections.list(request.getHeaderNames()).forEach(name -> {{
                if (!"host".equalsIgnoreCase(name) && !"content-length".equalsIgnoreCase(name)) {{
                    headers.addAll(name, Collections.list(request.getHeaders(name)));
                }}
            }});
            HttpEntity<byte[]> entity = new HttpEntity<>(body, headers);
            return restTemplate.exchange(uri, HttpMethod.valueOf(request.getMethod()), entity, byte[].class);
        }}

        @RequestMapping("/")
        public ApiResponse<String> root() {{
            return ApiResponse.success("Coffee Chain API Gateway is running. Use /api/** or /swagger-ui.html.");
        }}

        private String resolveService(String path) {{
            if (path.startsWith("/api/auth")) return "auth-service";
            if (path.startsWith("/api/admin/users")) return "user-service";
            if (path.startsWith("/api/admin/branches") || path.startsWith("/api/admin/work-schedules")) return "branch-service";
            if (path.startsWith("/api/admin/products")) return "product-service";
            if (path.startsWith("/api/admin/inventory")) return "inventory-service";
            if (path.startsWith("/api/admin/orders")) return "order-service";
            if (path.startsWith("/api/admin/customers")) return "customer-service";
            if (path.startsWith("/api/admin/promotions")) return "promotion-service";
            if (path.startsWith("/api/admin/content")) return "content-service";
            if (path.startsWith("/api/admin/reports")) return "report-service";
            if (path.startsWith("/api/admin/ai")) return "ai-service";
            throw new BadRequestException("Unsupported gateway route: " + path);
        }}
    }}
    """)


def add_support_entities_auth() -> None:
    module = "auth-service"
    pkg = f"{GROUP_ID}.{package_name(module)}"
    base = ROOT / module / "src/main/java" / pkg.replace(".", "/")
    write(base / "entity/RefreshToken.java", f"""
    package {pkg}.entity;

    import jakarta.persistence.Column;
    import jakarta.persistence.Entity;
    import jakarta.persistence.GeneratedValue;
    import jakarta.persistence.GenerationType;
    import jakarta.persistence.Id;
    import jakarta.persistence.Table;
    import java.time.LocalDateTime;

    @Entity
    @Table(name = "refresh_token")
    public class RefreshToken {{
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        @Column(name = "token_id")
        private Long tokenId;

        @Column(name = "employee_id", nullable = false)
        private Long employeeId;

        @Column(name = "token", nullable = false, unique = true, length = 500)
        private String token;

        @Column(name = "expires_at", nullable = false)
        private LocalDateTime expiresAt;

        @Column(name = "revoked", nullable = false)
        private Boolean revoked = false;

        @Column(name = "created_at")
        private LocalDateTime createdAt;

        public Long getTokenId() {{ return tokenId; }}
        public void setTokenId(Long tokenId) {{ this.tokenId = tokenId; }}
        public Long getEmployeeId() {{ return employeeId; }}
        public void setEmployeeId(Long employeeId) {{ this.employeeId = employeeId; }}
        public String getToken() {{ return token; }}
        public void setToken(String token) {{ this.token = token; }}
        public LocalDateTime getExpiresAt() {{ return expiresAt; }}
        public void setExpiresAt(LocalDateTime expiresAt) {{ this.expiresAt = expiresAt; }}
        public Boolean getRevoked() {{ return revoked; }}
        public void setRevoked(Boolean revoked) {{ this.revoked = revoked; }}
        public LocalDateTime getCreatedAt() {{ return createdAt; }}
        public void setCreatedAt(LocalDateTime createdAt) {{ this.createdAt = createdAt; }}
    }}
    """)
    write(base / "repository/RefreshTokenRepository.java", f"""
    package {pkg}.repository;

    import {pkg}.entity.RefreshToken;
    import java.util.Optional;
    import org.springframework.data.jpa.repository.JpaRepository;
    import org.springframework.stereotype.Repository;

    @Repository
    public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {{
        Optional<RefreshToken> findByTokenAndRevokedFalse(String token);
        void deleteByEmployeeId(Long employeeId);
    }}
    """)


def generate_auth_service() -> None:
    add_support_entities_auth()
    pkg = f"{GROUP_ID}.{package_name('auth-service')}"
    base = ROOT / "auth-service" / "src/main/java" / pkg.replace(".", "/")
    write(base / "dto/request/LoginRequest.java", f"""
    package {pkg}.dto.request;

    import jakarta.validation.constraints.NotBlank;

    public class LoginRequest {{
        private String email;
        private String phoneNumber;
        private String identifier;
        @NotBlank
        private String password;

        public String resolveIdentifier() {{
            if (identifier != null && !identifier.isBlank()) return identifier;
            if (email != null && !email.isBlank()) return email;
            return phoneNumber;
        }}

        public String getEmail() {{ return email; }}
        public void setEmail(String email) {{ this.email = email; }}
        public String getPhoneNumber() {{ return phoneNumber; }}
        public void setPhoneNumber(String phoneNumber) {{ this.phoneNumber = phoneNumber; }}
        public String getIdentifier() {{ return identifier; }}
        public void setIdentifier(String identifier) {{ this.identifier = identifier; }}
        public String getPassword() {{ return password; }}
        public void setPassword(String password) {{ this.password = password; }}
    }}
    """)
    for cls, fields in {
        "RefreshTokenRequest": "private String refreshToken;",
        "ForgotPasswordRequest": "private String identifier;",
        "VerifyOtpRequest": "private String identifier; private String otp;",
        "ResetPasswordRequest": "private String identifier; private String otp; private String newPassword;",
        "ChangePasswordRequest": "private String currentPassword; private String newPassword;",
        "LogoutRequest": "private String refreshToken;",
    }.items():
        methods = []
        for field_decl in fields.split(";"):
            field_decl = field_decl.strip()
            if not field_decl:
                continue
            name = field_decl.split()[-1]
            methods.append(f"    public String get{pascal(name)}() {{ return {name}; }}")
            methods.append(f"    public void set{pascal(name)}(String {name}) {{ this.{name} = {name}; }}")
        write(base / f"dto/request/{cls}.java", f"""
        package {pkg}.dto.request;

        public class {cls} {{
            {fields}
        {chr(10).join(methods)}
        }}
        """)
    write(base / "dto/response/UserInfoResponse.java", f"""
    package {pkg}.dto.response;

    public class UserInfoResponse {{
        private Long id;
        private String name;
        private String email;
        private String phoneNumber;
        private String roleName;
        private Long branchId;
        private String status;

        public Long getId() {{ return id; }}
        public void setId(Long id) {{ this.id = id; }}
        public String getName() {{ return name; }}
        public void setName(String name) {{ this.name = name; }}
        public String getEmail() {{ return email; }}
        public void setEmail(String email) {{ this.email = email; }}
        public String getPhoneNumber() {{ return phoneNumber; }}
        public void setPhoneNumber(String phoneNumber) {{ this.phoneNumber = phoneNumber; }}
        public String getRoleName() {{ return roleName; }}
        public void setRoleName(String roleName) {{ this.roleName = roleName; }}
        public Long getBranchId() {{ return branchId; }}
        public void setBranchId(Long branchId) {{ this.branchId = branchId; }}
        public String getStatus() {{ return status; }}
        public void setStatus(String status) {{ this.status = status; }}
    }}
    """)
    write(base / "dto/response/LoginResponse.java", f"""
    package {pkg}.dto.response;

    public class LoginResponse {{
        private String accessToken;
        private String refreshToken;
        private String role;
        private UserInfoResponse userInfo;

        public String getAccessToken() {{ return accessToken; }}
        public void setAccessToken(String accessToken) {{ this.accessToken = accessToken; }}
        public String getRefreshToken() {{ return refreshToken; }}
        public void setRefreshToken(String refreshToken) {{ this.refreshToken = refreshToken; }}
        public String getRole() {{ return role; }}
        public void setRole(String role) {{ this.role = role; }}
        public UserInfoResponse getUserInfo() {{ return userInfo; }}
        public void setUserInfo(UserInfoResponse userInfo) {{ this.userInfo = userInfo; }}
    }}
    """)
    write(base / "service/AuthService.java", f"""
    package {pkg}.service;

    import {pkg}.dto.request.*;
    import {pkg}.dto.response.LoginResponse;
    import {pkg}.dto.response.UserInfoResponse;
    import com.coffee.common.security.AuthenticatedUser;

    public interface AuthService {{
        LoginResponse login(LoginRequest request);
        void logout(LogoutRequest request);
        LoginResponse refresh(RefreshTokenRequest request);
        void forgotPassword(ForgotPasswordRequest request);
        void verifyOtp(VerifyOtpRequest request);
        void resetPassword(ResetPasswordRequest request);
        void changePassword(AuthenticatedUser user, ChangePasswordRequest request);
        UserInfoResponse me(AuthenticatedUser user);
    }}
    """)
    write(base / "service/impl/AuthServiceImpl.java", f"""
    package {pkg}.service.impl;

    import com.coffee.common.exception.BadRequestException;
    import com.coffee.common.exception.UnauthorizedException;
    import com.coffee.common.security.AuthenticatedUser;
    import com.coffee.common.security.JwtService;
    import {pkg}.dto.request.*;
    import {pkg}.dto.response.LoginResponse;
    import {pkg}.dto.response.UserInfoResponse;
    import {pkg}.entity.Employee;
    import {pkg}.entity.EmployeeDetail;
    import {pkg}.entity.RefreshToken;
    import {pkg}.entity.Role;
    import {pkg}.repository.EmployeeDetailRepository;
    import {pkg}.repository.EmployeeRepository;
    import {pkg}.repository.RefreshTokenRepository;
    import {pkg}.repository.RoleRepository;
    import {pkg}.service.AuthService;
    import java.time.LocalDateTime;
    import java.util.Map;
    import java.util.UUID;
    import java.util.concurrent.ConcurrentHashMap;
    import org.slf4j.Logger;
    import org.slf4j.LoggerFactory;
    import org.springframework.beans.factory.annotation.Value;
    import org.springframework.security.crypto.password.PasswordEncoder;
    import org.springframework.stereotype.Service;
    import org.springframework.transaction.annotation.Transactional;

    @Service
    public class AuthServiceImpl implements AuthService {{
        private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);

        private final EmployeeRepository employeeRepository;
        private final EmployeeDetailRepository detailRepository;
        private final RoleRepository roleRepository;
        private final RefreshTokenRepository refreshTokenRepository;
        private final PasswordEncoder passwordEncoder;
        private final JwtService jwtService;
        private final long refreshTokenDays;
        private final Map<String, String> otpStore = new ConcurrentHashMap<>();

        public AuthServiceImpl(EmployeeRepository employeeRepository, EmployeeDetailRepository detailRepository,
                               RoleRepository roleRepository, RefreshTokenRepository refreshTokenRepository,
                               PasswordEncoder passwordEncoder, JwtService jwtService,
                               @Value("${{app.jwt.refresh-token-days:7}}") long refreshTokenDays) {{
            this.employeeRepository = employeeRepository;
            this.detailRepository = detailRepository;
            this.roleRepository = roleRepository;
            this.refreshTokenRepository = refreshTokenRepository;
            this.passwordEncoder = passwordEncoder;
            this.jwtService = jwtService;
            this.refreshTokenDays = refreshTokenDays;
        }}

        @Override
        @Transactional
        public LoginResponse login(LoginRequest request) {{
            String identifier = request.resolveIdentifier();
            if (identifier == null || identifier.isBlank()) {{
                throw new BadRequestException("Email or phone number is required");
            }}
            EmployeeDetail detail = detailRepository.findByEmail(identifier)
                    .or(() -> detailRepository.findByPhoneNumber(identifier))
                    .orElseThrow(() -> new UnauthorizedException("Invalid email/phone or password"));
            Employee employee = employeeRepository.findById(detail.getEmployeeId())
                    .orElseThrow(() -> new UnauthorizedException("Invalid email/phone or password"));
            if (!"active".equalsIgnoreCase(employee.getStatus())) {{
                throw new UnauthorizedException("Inactive accounts cannot log in");
            }}
            if (detail.getPassword() == null || !passwordEncoder.matches(request.getPassword(), detail.getPassword())) {{
                throw new UnauthorizedException("Invalid email/phone or password");
            }}
            Role role = roleRepository.findById(employee.getRoleId())
                    .orElseThrow(() -> new UnauthorizedException("Employee role is missing"));
            String accessToken = jwtService.generateAccessToken(employee.getId(), role.getRoleName(), employee.getBranchId());
            String refreshTokenValue = UUID.randomUUID().toString().replace("-", "");
            RefreshToken refreshToken = new RefreshToken();
            refreshToken.setEmployeeId(employee.getId());
            refreshToken.setToken(refreshTokenValue);
            refreshToken.setExpiresAt(LocalDateTime.now().plusDays(refreshTokenDays));
            refreshToken.setRevoked(false);
            refreshToken.setCreatedAt(LocalDateTime.now());
            refreshTokenRepository.save(refreshToken);

            LoginResponse response = new LoginResponse();
            response.setAccessToken(accessToken);
            response.setRefreshToken(refreshTokenValue);
            response.setRole(role.getRoleName());
            response.setUserInfo(toUserInfo(employee, detail, role));
            return response;
        }}

        @Override
        @Transactional
        public void logout(LogoutRequest request) {{
            if (request.getRefreshToken() == null) return;
            refreshTokenRepository.findByTokenAndRevokedFalse(request.getRefreshToken()).ifPresent(token -> {{
                token.setRevoked(true);
                refreshTokenRepository.save(token);
            }});
        }}

        @Override
        @Transactional
        public LoginResponse refresh(RefreshTokenRequest request) {{
            RefreshToken token = refreshTokenRepository.findByTokenAndRevokedFalse(request.getRefreshToken())
                    .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));
            if (token.getExpiresAt().isBefore(LocalDateTime.now())) {{
                token.setRevoked(true);
                refreshTokenRepository.save(token);
                throw new UnauthorizedException("Refresh token expired");
            }}
            Employee employee = employeeRepository.findById(token.getEmployeeId()).orElseThrow(() -> new UnauthorizedException("Employee not found"));
            EmployeeDetail detail = detailRepository.findById(employee.getId()).orElseThrow(() -> new UnauthorizedException("Employee detail not found"));
            Role role = roleRepository.findById(employee.getRoleId()).orElseThrow(() -> new UnauthorizedException("Role not found"));
            LoginResponse response = new LoginResponse();
            response.setAccessToken(jwtService.generateAccessToken(employee.getId(), role.getRoleName(), employee.getBranchId()));
            response.setRefreshToken(token.getToken());
            response.setRole(role.getRoleName());
            response.setUserInfo(toUserInfo(employee, detail, role));
            return response;
        }}

        @Override
        public void forgotPassword(ForgotPasswordRequest request) {{
            String otp = "123456";
            otpStore.put(request.getIdentifier(), otp);
            log.info("Mock forgot-password OTP for {{}}: {{}}", request.getIdentifier(), otp);
        }}

        @Override
        public void verifyOtp(VerifyOtpRequest request) {{
            if (!request.getOtp().equals(otpStore.get(request.getIdentifier()))) {{
                throw new BadRequestException("Invalid OTP");
            }}
        }}

        @Override
        @Transactional
        public void resetPassword(ResetPasswordRequest request) {{
            verifyOtp(toVerifyRequest(request));
            EmployeeDetail detail = detailRepository.findByEmail(request.getIdentifier())
                    .or(() -> detailRepository.findByPhoneNumber(request.getIdentifier()))
                    .orElseThrow(() -> new BadRequestException("Account not found"));
            detail.setPassword(passwordEncoder.encode(request.getNewPassword()));
            detailRepository.save(detail);
            otpStore.remove(request.getIdentifier());
        }}

        @Override
        @Transactional
        public void changePassword(AuthenticatedUser user, ChangePasswordRequest request) {{
            EmployeeDetail detail = detailRepository.findById(user.getUserId()).orElseThrow(() -> new BadRequestException("Account not found"));
            if (!passwordEncoder.matches(request.getCurrentPassword(), detail.getPassword())) {{
                throw new BadRequestException("Current password is incorrect");
            }}
            detail.setPassword(passwordEncoder.encode(request.getNewPassword()));
            detailRepository.save(detail);
        }}

        @Override
        public UserInfoResponse me(AuthenticatedUser user) {{
            Employee employee = employeeRepository.findById(user.getUserId()).orElseThrow(() -> new BadRequestException("Account not found"));
            EmployeeDetail detail = detailRepository.findById(employee.getId()).orElseThrow(() -> new BadRequestException("Account detail not found"));
            Role role = roleRepository.findById(employee.getRoleId()).orElseThrow(() -> new BadRequestException("Role not found"));
            return toUserInfo(employee, detail, role);
        }}

        private VerifyOtpRequest toVerifyRequest(ResetPasswordRequest request) {{
            VerifyOtpRequest verify = new VerifyOtpRequest();
            verify.setIdentifier(request.getIdentifier());
            verify.setOtp(request.getOtp());
            return verify;
        }}

        private UserInfoResponse toUserInfo(Employee employee, EmployeeDetail detail, Role role) {{
            UserInfoResponse user = new UserInfoResponse();
            user.setId(employee.getId());
            user.setName(employee.getName());
            user.setEmail(detail.getEmail());
            user.setPhoneNumber(detail.getPhoneNumber());
            user.setRoleName(role.getRoleName());
            user.setBranchId(employee.getBranchId());
            user.setStatus(employee.getStatus());
            return user;
        }}
    }}
    """)
    write(base / "controller/AuthController.java", f"""
    package {pkg}.controller;

    import com.coffee.common.response.ApiResponse;
    import com.coffee.common.security.AuthenticatedUser;
    import {pkg}.dto.request.*;
    import {pkg}.dto.response.LoginResponse;
    import {pkg}.dto.response.UserInfoResponse;
    import {pkg}.service.AuthService;
    import jakarta.validation.Valid;
    import org.springframework.security.core.annotation.AuthenticationPrincipal;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.PostMapping;
    import org.springframework.web.bind.annotation.RequestBody;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/api/auth")
    public class AuthController {{
        private final AuthService authService;

        public AuthController(AuthService authService) {{
            this.authService = authService;
        }}

        @PostMapping("/login")
        public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {{
            return ApiResponse.success("Login successful", authService.login(request));
        }}

        @PostMapping("/logout")
        public ApiResponse<Void> logout(@RequestBody LogoutRequest request) {{
            authService.logout(request);
            return ApiResponse.success("Logout successful", null);
        }}

        @PostMapping("/refresh-token")
        public ApiResponse<LoginResponse> refresh(@RequestBody RefreshTokenRequest request) {{
            return ApiResponse.success(authService.refresh(request));
        }}

        @PostMapping("/forgot-password")
        public ApiResponse<Void> forgotPassword(@RequestBody ForgotPasswordRequest request) {{
            authService.forgotPassword(request);
            return ApiResponse.success("OTP sent", null);
        }}

        @PostMapping("/verify-otp")
        public ApiResponse<Void> verifyOtp(@RequestBody VerifyOtpRequest request) {{
            authService.verifyOtp(request);
            return ApiResponse.success("OTP verified", null);
        }}

        @PostMapping("/reset-password")
        public ApiResponse<Void> resetPassword(@RequestBody ResetPasswordRequest request) {{
            authService.resetPassword(request);
            return ApiResponse.success("Password reset", null);
        }}

        @PostMapping("/change-password")
        public ApiResponse<Void> changePassword(@AuthenticationPrincipal AuthenticatedUser user, @RequestBody ChangePasswordRequest request) {{
            authService.changePassword(user, request);
            return ApiResponse.success("Password changed", null);
        }}

        @GetMapping("/me")
        public ApiResponse<UserInfoResponse> me(@AuthenticationPrincipal AuthenticatedUser user) {{
            return ApiResponse.success(authService.me(user));
        }}
    }}
    """)
    write(base / "config/AdminDataSeeder.java", f"""
    package {pkg}.config;

    import {pkg}.entity.Employee;
    import {pkg}.entity.EmployeeDetail;
    import {pkg}.entity.Role;
    import {pkg}.repository.EmployeeDetailRepository;
    import {pkg}.repository.EmployeeRepository;
    import {pkg}.repository.RoleRepository;
    import java.time.LocalDateTime;
    import org.springframework.boot.ApplicationArguments;
    import org.springframework.boot.ApplicationRunner;
    import org.springframework.beans.factory.annotation.Value;
    import org.springframework.security.crypto.password.PasswordEncoder;
    import org.springframework.stereotype.Component;
    import org.springframework.transaction.annotation.Transactional;

    @Component
    public class AdminDataSeeder implements ApplicationRunner {{
        private final RoleRepository roleRepository;
        private final EmployeeRepository employeeRepository;
        private final EmployeeDetailRepository detailRepository;
        private final PasswordEncoder passwordEncoder;
        private final String adminEmail;
        private final String adminPassword;

        public AdminDataSeeder(RoleRepository roleRepository, EmployeeRepository employeeRepository,
                               EmployeeDetailRepository detailRepository, PasswordEncoder passwordEncoder,
                               @Value("${{app.seed.admin-email:admin@coffee.local}}") String adminEmail,
                               @Value("${{app.seed.admin-password:Admin@123}}") String adminPassword) {{
            this.roleRepository = roleRepository;
            this.employeeRepository = employeeRepository;
            this.detailRepository = detailRepository;
            this.passwordEncoder = passwordEncoder;
            this.adminEmail = adminEmail;
            this.adminPassword = adminPassword;
        }}

        @Override
        @Transactional
        public void run(ApplicationArguments args) {{
            Role adminRole = roleRepository.findByRoleName("admin").orElseGet(() -> {{
                Role role = new Role();
                role.setRoleName("admin");
                role.setRoleGroup("admin");
                role.setDepartment("system");
                role.setStatus("active");
                return roleRepository.save(role);
            }});
            if (detailRepository.existsByEmail(adminEmail)) {{
                return;
            }}
            Employee employee = new Employee();
            employee.setName("System Admin");
            employee.setRoleId(adminRole.getRoleId());
            employee.setStatus("active");
            employee = employeeRepository.save(employee);

            EmployeeDetail detail = new EmployeeDetail();
            detail.setEmployeeId(employee.getId());
            detail.setEmail(adminEmail);
            detail.setPhoneNumber("0900000000");
            detail.setPassword(passwordEncoder.encode(adminPassword));
            detail.setGender("other");
            detail.setCreatedAt(LocalDateTime.now());
            detailRepository.save(detail);
        }}
    }}
    """)


def generate_branch_extras() -> None:
    module = "branch-service"
    pkg = f"{GROUP_ID}.{package_name(module)}"
    base = ROOT / module / "src/main/java" / pkg.replace(".", "/")
    write(base / "controller/BranchOperationsController.java", f"""
    package {pkg}.controller;

    import com.coffee.common.exception.BadRequestException;
    import com.coffee.common.response.ApiResponse;
    import {pkg}.dto.request.BranchHoursRequest;
    import {pkg}.dto.response.BranchHoursResponse;
    import {pkg}.dto.response.EmployeeResponse;
    import {pkg}.entity.BranchHours;
    import {pkg}.entity.Employee;
    import {pkg}.mapper.BranchHoursMapper;
    import {pkg}.mapper.EmployeeMapper;
    import {pkg}.repository.BranchHoursRepository;
    import {pkg}.repository.EmployeeRepository;
    import java.util.List;
    import org.springframework.security.access.prepost.PreAuthorize;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.PatchMapping;
    import org.springframework.web.bind.annotation.PathVariable;
    import org.springframework.web.bind.annotation.PutMapping;
    import org.springframework.web.bind.annotation.RequestBody;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RequestParam;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/api/admin/branches")
    @PreAuthorize("hasRole('admin')")
    public class BranchOperationsController {{
        private final BranchHoursRepository hoursRepository;
        private final BranchHoursMapper hoursMapper;
        private final EmployeeRepository employeeRepository;
        private final EmployeeMapper employeeMapper;

        public BranchOperationsController(BranchHoursRepository hoursRepository, BranchHoursMapper hoursMapper,
                                          EmployeeRepository employeeRepository, EmployeeMapper employeeMapper) {{
            this.hoursRepository = hoursRepository;
            this.hoursMapper = hoursMapper;
            this.employeeRepository = employeeRepository;
            this.employeeMapper = employeeMapper;
        }}

        @GetMapping("/{{branchId}}/hours")
        public ApiResponse<List<BranchHoursResponse>> hours(@PathVariable Long branchId) {{
            return ApiResponse.success(hoursRepository.findAll().stream()
                    .filter(item -> branchId.equals(item.getBranchId()))
                    .map(hoursMapper::toResponse)
                    .toList());
        }}

        @PutMapping("/{{branchId}}/hours")
        public ApiResponse<List<BranchHoursResponse>> updateHours(@PathVariable Long branchId, @RequestBody List<BranchHoursRequest> requests) {{
            List<BranchHours> saved = requests.stream().map(request -> {{
                if (Boolean.FALSE.equals(request.getIsClosed()) && request.getOpenTime() != null && request.getCloseTime() != null
                        && !request.getCloseTime().isAfter(request.getOpenTime())) {{
                    throw new BadRequestException("Closing time must be after opening time");
                }}
                BranchHours entity = hoursMapper.toEntity(request);
                entity.setBranchId(branchId);
                return hoursRepository.save(entity);
            }}).toList();
            return ApiResponse.success(saved.stream().map(hoursMapper::toResponse).toList());
        }}

        @GetMapping("/{{branchId}}/employees")
        public ApiResponse<List<EmployeeResponse>> employees(@PathVariable Long branchId) {{
            return ApiResponse.success(employeeRepository.findAll().stream()
                    .filter(item -> branchId.equals(item.getBranchId()))
                    .map(employeeMapper::toResponse)
                    .toList());
        }}

        @PatchMapping("/{{branchId}}/assign-manager")
        public ApiResponse<EmployeeResponse> assignManager(@PathVariable Long branchId, @RequestParam Long employeeId) {{
            return assign(branchId, employeeId);
        }}

        @PatchMapping("/{{branchId}}/assign-employee")
        public ApiResponse<EmployeeResponse> assignEmployee(@PathVariable Long branchId, @RequestParam Long employeeId) {{
            return assign(branchId, employeeId);
        }}

        private ApiResponse<EmployeeResponse> assign(Long branchId, Long employeeId) {{
            Employee employee = employeeRepository.findById(employeeId).orElseThrow(() -> new BadRequestException("Employee not found"));
            employee.setBranchId(branchId);
            return ApiResponse.success(employeeMapper.toResponse(employeeRepository.save(employee)));
        }}
    }}
    """)


def generate_user_extras() -> None:
    module = "user-service"
    pkg = f"{GROUP_ID}.{package_name(module)}"
    base = ROOT / module / "src/main/java" / pkg.replace(".", "/")
    write(base / "controller/UserOperationsController.java", f"""
    package {pkg}.controller;

    import com.coffee.common.response.ApiResponse;
    import {pkg}.repository.OrderEntityRepository;
    import {pkg}.repository.PointHistoryRepository;
    import java.util.List;
    import java.util.Map;
    import org.springframework.jdbc.core.JdbcTemplate;
    import org.springframework.security.access.prepost.PreAuthorize;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.PathVariable;
    import org.springframework.web.bind.annotation.PutMapping;
    import org.springframework.web.bind.annotation.RequestBody;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/api/admin/users")
    @PreAuthorize("hasRole('admin')")
    public class UserOperationsController {{
        private final OrderEntityRepository orderRepository;
        private final PointHistoryRepository pointHistoryRepository;
        private final JdbcTemplate jdbcTemplate;

        public UserOperationsController(OrderEntityRepository orderRepository,
                                        PointHistoryRepository pointHistoryRepository,
                                        JdbcTemplate jdbcTemplate) {{
            this.orderRepository = orderRepository;
            this.pointHistoryRepository = pointHistoryRepository;
            this.jdbcTemplate = jdbcTemplate;
        }}

        @GetMapping("/customers/{{id}}/orders")
        public ApiResponse<?> customerOrders(@PathVariable Long id) {{
            return ApiResponse.success(orderRepository.findAll().stream()
                    .filter(item -> id.equals(item.getCustomerId()))
                    .toList());
        }}

        @GetMapping("/customers/{{id}}/point-history")
        public ApiResponse<?> customerPointHistory(@PathVariable Long id) {{
            return ApiResponse.success(pointHistoryRepository.findAll().stream()
                    .filter(item -> id.equals(item.getCustomerId()))
                    .toList());
        }}

        @PutMapping("/roles/{{id}}/permissions")
        public ApiResponse<?> updateRolePermissions(@PathVariable Long id, @RequestBody Map<String, List<String>> request) {{
            List<String> permissions = request.getOrDefault("permissions", List.of());
            jdbcTemplate.update("DELETE FROM role_permission WHERE role_id = ?", id);
            permissions.forEach(permission -> jdbcTemplate.update(
                    "INSERT INTO role_permission(role_id, permission_code) VALUES (?, ?)",
                    id,
                    permission
            ));
            return ApiResponse.success(Map.of("roleId", id, "permissions", permissions));
        }}
    }}
    """)


def generate_product_extras() -> None:
    module = "product-service"
    pkg = f"{GROUP_ID}.{package_name(module)}"
    base = ROOT / module / "src/main/java" / pkg.replace(".", "/")
    write(base / "controller/ProductRelationsController.java", f"""
    package {pkg}.controller;

    import com.coffee.common.response.ApiResponse;
    import {pkg}.dto.request.ProductSizeRequest;
    import {pkg}.entity.ProductVariant;
    import {pkg}.entity.ProductVariantId;
    import {pkg}.entity.ProductSize;
    import {pkg}.entity.SeasonalProduct;
    import {pkg}.entity.SeasonalProductId;
    import {pkg}.mapper.ProductSizeMapper;
    import {pkg}.repository.ProductSizeRepository;
    import {pkg}.repository.ProductVariantRepository;
    import {pkg}.repository.RecipeRepository;
    import {pkg}.repository.SeasonalProductRepository;
    import org.springframework.security.access.prepost.PreAuthorize;
    import org.springframework.web.bind.annotation.DeleteMapping;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.PathVariable;
    import org.springframework.web.bind.annotation.PostMapping;
    import org.springframework.web.bind.annotation.RequestBody;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/api/admin/products")
    @PreAuthorize("hasRole('admin')")
    public class ProductRelationsController {{
        private final ProductVariantRepository productVariantRepository;
        private final SeasonalProductRepository seasonalProductRepository;
        private final RecipeRepository recipeRepository;
        private final ProductSizeRepository productSizeRepository;
        private final ProductSizeMapper productSizeMapper;

        public ProductRelationsController(ProductVariantRepository productVariantRepository,
                                          SeasonalProductRepository seasonalProductRepository,
                                          RecipeRepository recipeRepository,
                                          ProductSizeRepository productSizeRepository,
                                          ProductSizeMapper productSizeMapper) {{
            this.productVariantRepository = productVariantRepository;
            this.seasonalProductRepository = seasonalProductRepository;
            this.recipeRepository = recipeRepository;
            this.productSizeRepository = productSizeRepository;
            this.productSizeMapper = productSizeMapper;
        }}

        @GetMapping("/{{productId}}/sizes")
        public ApiResponse<?> sizes(@PathVariable Long productId) {{
            return ApiResponse.success(productSizeRepository.findAll().stream()
                    .filter(item -> productId.equals(item.getProductId()))
                    .map(productSizeMapper::toResponse)
                    .toList());
        }}

        @PostMapping("/{{productId}}/sizes")
        public ApiResponse<?> addSize(@PathVariable Long productId, @RequestBody ProductSizeRequest request) {{
            request.setProductId(productId);
            ProductSize size = productSizeMapper.toEntity(request);
            return ApiResponse.success("Created", productSizeMapper.toResponse(productSizeRepository.save(size)));
        }}

        @PostMapping("/{{productId}}/variants/{{variantId}}")
        public ApiResponse<Void> addVariant(@PathVariable Long productId, @PathVariable Long variantId) {{
            ProductVariant item = new ProductVariant();
            item.setProductId(productId);
            item.setVariantId(variantId);
            item.setIsDefault(false);
            productVariantRepository.save(item);
            return ApiResponse.success("Variant assigned", null);
        }}

        @DeleteMapping("/{{productId}}/variants/{{variantId}}")
        public ApiResponse<Void> removeVariant(@PathVariable Long productId, @PathVariable Long variantId) {{
            ProductVariantId id = new ProductVariantId();
            id.setProductId(productId);
            id.setVariantId(variantId);
            productVariantRepository.deleteById(id);
            return ApiResponse.success("Variant removed", null);
        }}

        @PostMapping("/seasons/{{seasonId}}/products/{{productId}}")
        public ApiResponse<Void> addSeasonalProduct(@PathVariable Long seasonId, @PathVariable Long productId) {{
            SeasonalProduct item = new SeasonalProduct();
            item.setSeasonId(seasonId);
            item.setProductId(productId);
            seasonalProductRepository.save(item);
            return ApiResponse.success("Seasonal product assigned", null);
        }}

        @DeleteMapping("/seasons/{{seasonId}}/products/{{productId}}")
        public ApiResponse<Void> removeSeasonalProduct(@PathVariable Long seasonId, @PathVariable Long productId) {{
            SeasonalProductId id = new SeasonalProductId();
            id.setSeasonId(seasonId);
            id.setProductId(productId);
            seasonalProductRepository.deleteById(id);
            return ApiResponse.success("Seasonal product removed", null);
        }}

        @GetMapping("/{{productId}}/recipes")
        public ApiResponse<?> recipesByProduct(@PathVariable Long productId) {{
            return ApiResponse.success(recipeRepository.findAll().stream()
                    .filter(item -> productId.equals(item.getProductId()))
                    .toList());
        }}
    }}
    """)


def generate_inventory_extras() -> None:
    module = "inventory-service"
    pkg = f"{GROUP_ID}.{package_name(module)}"
    base = ROOT / module / "src/main/java" / pkg.replace(".", "/")
    write(base / "controller/InventoryOperationsController.java", f"""
    package {pkg}.controller;

    import com.coffee.common.response.ApiResponse;
    import {pkg}.dto.request.SupplierIngredientRequest;
    import {pkg}.entity.SupplierIngredient;
    import {pkg}.entity.SupplierIngredientId;
    import {pkg}.mapper.SupplierIngredientMapper;
    import {pkg}.repository.SupplierIngredientRepository;
    import {pkg}.repository.WarehouseStockRepository;
    import java.util.List;
    import org.springframework.security.access.prepost.PreAuthorize;
    import org.springframework.web.bind.annotation.DeleteMapping;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.PathVariable;
    import org.springframework.web.bind.annotation.PostMapping;
    import org.springframework.web.bind.annotation.PutMapping;
    import org.springframework.web.bind.annotation.RequestBody;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/api/admin/inventory")
    @PreAuthorize("hasRole('admin')")
    public class InventoryOperationsController {{
        private final SupplierIngredientRepository supplierIngredientRepository;
        private final SupplierIngredientMapper supplierIngredientMapper;
        private final WarehouseStockRepository stockRepository;

        public InventoryOperationsController(SupplierIngredientRepository supplierIngredientRepository,
                                             SupplierIngredientMapper supplierIngredientMapper,
                                             WarehouseStockRepository stockRepository) {{
            this.supplierIngredientRepository = supplierIngredientRepository;
            this.supplierIngredientMapper = supplierIngredientMapper;
            this.stockRepository = stockRepository;
        }}

        @GetMapping("/suppliers/{{id}}/ingredients")
        public ApiResponse<List<?>> supplierIngredients(@PathVariable Long id) {{
            return ApiResponse.success(supplierIngredientRepository.findAll().stream()
                    .filter(item -> id.equals(item.getSupplierId()))
                    .map(supplierIngredientMapper::toResponse)
                    .toList());
        }}

        @PostMapping("/suppliers/{{id}}/ingredients")
        public ApiResponse<?> addSupplierIngredient(@PathVariable Long id, @RequestBody SupplierIngredientRequest request) {{
            request.setSupplierId(id);
            SupplierIngredient entity = supplierIngredientMapper.toEntity(request);
            return ApiResponse.success(supplierIngredientMapper.toResponse(supplierIngredientRepository.save(entity)));
        }}

        @DeleteMapping("/suppliers/{{id}}/ingredients/{{ingredientId}}")
        public ApiResponse<Void> deleteSupplierIngredient(@PathVariable Long id, @PathVariable Long ingredientId) {{
            SupplierIngredientId key = new SupplierIngredientId();
            key.setSupplierId(id);
            key.setIngredientId(ingredientId);
            supplierIngredientRepository.deleteById(key);
            return ApiResponse.success("Supplier ingredient removed", null);
        }}

        @GetMapping("/stocks/low-stock")
        public ApiResponse<?> lowStock() {{
            return ApiResponse.success(stockRepository.findAll().stream()
                    .filter(item -> item.getQuantity() != null && item.getMinQuantity() != null && item.getQuantity() < item.getMinQuantity())
                    .toList());
        }}

        @PutMapping("/stocks/{{id}}/min-quantity")
        public ApiResponse<?> minQuantity(@PathVariable Long id, @RequestBody java.util.Map<String, Double> request) {{
            return stockRepository.findById(id).map(stock -> {{
                stock.setMinQuantity(request.getOrDefault("minQuantity", stock.getMinQuantity()));
                return ApiResponse.success(stockRepository.save(stock));
            }}).orElseGet(() -> ApiResponse.error("Stock not found", null));
        }}
    }}
    """)


def generate_order_extras() -> None:
    module = "order-service"
    pkg = f"{GROUP_ID}.{package_name(module)}"
    base = ROOT / module / "src/main/java" / pkg.replace(".", "/")
    write(base / "controller/OrderOperationsController.java", f"""
    package {pkg}.controller;

    import com.coffee.common.exception.BadRequestException;
    import com.coffee.common.response.ApiResponse;
    import {pkg}.entity.OrderEntity;
    import {pkg}.repository.OrderEntityRepository;
    import {pkg}.repository.PaymentRepository;
    import java.util.Map;
    import java.util.Set;
    import org.springframework.security.access.prepost.PreAuthorize;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.PatchMapping;
    import org.springframework.web.bind.annotation.PathVariable;
    import org.springframework.web.bind.annotation.RequestBody;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/api/admin/orders")
    @PreAuthorize("hasRole('admin')")
    public class OrderOperationsController {{
        private final OrderEntityRepository orderRepository;
        private final PaymentRepository paymentRepository;

        public OrderOperationsController(OrderEntityRepository orderRepository, PaymentRepository paymentRepository) {{
            this.orderRepository = orderRepository;
            this.paymentRepository = paymentRepository;
        }}

        @PatchMapping("/{{id}}/status")
        public ApiResponse<OrderEntity> status(@PathVariable Long id, @RequestBody Map<String, String> request) {{
            OrderEntity order = orderRepository.findById(id).orElseThrow(() -> new BadRequestException("Order not found"));
            String next = request.get("status");
            if (!allowed(order.getStatus(), next)) {{
                throw new BadRequestException("Invalid order status transition");
            }}
            order.setStatus(next);
            return ApiResponse.success(orderRepository.save(order));
        }}

        @GetMapping("/{{id}}/payment")
        public ApiResponse<?> payment(@PathVariable Long id) {{
            return ApiResponse.success(paymentRepository.findAll().stream().filter(item -> id.equals(item.getOrderId())).findFirst().orElse(null));
        }}

        @GetMapping("/statistics")
        public ApiResponse<?> statistics() {{
            long total = orderRepository.count();
            long completed = orderRepository.findAll().stream().filter(o -> "completed".equalsIgnoreCase(o.getStatus())).count();
            long cancelled = orderRepository.findAll().stream().filter(o -> "cancelled".equalsIgnoreCase(o.getStatus())).count();
            return ApiResponse.success(Map.of("totalOrders", total, "completedOrders", completed, "cancelledOrders", cancelled));
        }}

        private boolean allowed(String current, String next) {{
            if (next == null) return false;
            if ("cancelled".equalsIgnoreCase(current) || "completed".equalsIgnoreCase(current)) return false;
            return Set.of("pending", "confirmed", "preparing", "delivering", "completed", "cancelled").contains(next);
        }}
    }}
    """)


def generate_customer_extras() -> None:
    module = "customer-service"
    pkg = f"{GROUP_ID}.{package_name(module)}"
    base = ROOT / module / "src/main/java" / pkg.replace(".", "/")
    write(base / "controller/CustomerOperationsController.java", f"""
    package {pkg}.controller;

    import com.coffee.common.exception.BadRequestException;
    import com.coffee.common.response.ApiResponse;
    import {pkg}.entity.PointHistory;
    import {pkg}.repository.CustomerLoyaltyRepository;
    import {pkg}.repository.PointHistoryRepository;
    import java.time.LocalDateTime;
    import java.util.Map;
    import org.springframework.security.access.prepost.PreAuthorize;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.PatchMapping;
    import org.springframework.web.bind.annotation.PathVariable;
    import org.springframework.web.bind.annotation.RequestBody;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/api/admin/customers")
    @PreAuthorize("hasRole('admin')")
    public class CustomerOperationsController {{
        private final CustomerLoyaltyRepository loyaltyRepository;
        private final PointHistoryRepository pointHistoryRepository;

        public CustomerOperationsController(CustomerLoyaltyRepository loyaltyRepository, PointHistoryRepository pointHistoryRepository) {{
            this.loyaltyRepository = loyaltyRepository;
            this.pointHistoryRepository = pointHistoryRepository;
        }}

        @GetMapping("/{{id}}/loyalty")
        public ApiResponse<?> loyalty(@PathVariable Long id) {{
            return ApiResponse.success(loyaltyRepository.findById(id).orElse(null));
        }}

        @GetMapping("/{{id}}/point-history")
        public ApiResponse<?> pointHistory(@PathVariable Long id) {{
            return ApiResponse.success(pointHistoryRepository.findAll().stream().filter(item -> id.equals(item.getCustomerId())).toList());
        }}

        @PatchMapping("/{{id}}/adjust-points")
        public ApiResponse<?> adjustPoints(@PathVariable Long id, @RequestBody Map<String, Object> request) {{
            String reason = String.valueOf(request.getOrDefault("reason", ""));
            if (reason.isBlank()) {{
                throw new BadRequestException("Reason is required when adjusting points");
            }}
            String pointType = String.valueOf(request.getOrDefault("pointType", "drips"));
            Integer amount = Integer.valueOf(String.valueOf(request.getOrDefault("amount", "0")));
            PointHistory history = new PointHistory();
            history.setCustomerId(id);
            history.setPointType(pointType);
            history.setAction(amount >= 0 ? "earn" : "spend");
            history.setAmount(Math.abs(amount));
            history.setRemainingAmount(0);
            history.setNote(reason);
            history.setCreatedAt(LocalDateTime.now());
            history.setStatus("active");
            return ApiResponse.success(pointHistoryRepository.save(history));
        }}
    }}
    """)


def generate_promotion_extras() -> None:
    module = "promotion-service"
    pkg = f"{GROUP_ID}.{package_name(module)}"
    base = ROOT / module / "src/main/java" / pkg.replace(".", "/")
    write(base / "controller/CouponUsageController.java", f"""
    package {pkg}.controller;

    import com.coffee.common.response.ApiResponse;
    import {pkg}.repository.CouponUsageRepository;
    import org.springframework.security.access.prepost.PreAuthorize;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.PathVariable;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/api/admin/promotions/coupons")
    @PreAuthorize("hasRole('admin')")
    public class CouponUsageController {{
        private final CouponUsageRepository couponUsageRepository;

        public CouponUsageController(CouponUsageRepository couponUsageRepository) {{
            this.couponUsageRepository = couponUsageRepository;
        }}

        @GetMapping("/{{id}}/usages")
        public ApiResponse<?> usages(@PathVariable Long id) {{
            return ApiResponse.success(couponUsageRepository.findAll().stream().filter(item -> id.equals(item.getCouponId())).toList());
        }}
    }}
    """)


def generate_content_extras() -> None:
    module = "content-service"
    pkg = f"{GROUP_ID}.{package_name(module)}"
    base = ROOT / module / "src/main/java" / pkg.replace(".", "/")
    write(base / "controller/FileUploadController.java", f"""
    package {pkg}.controller;

    import com.coffee.common.exception.BadRequestException;
    import com.coffee.common.response.ApiResponse;
    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Path;
    import java.nio.file.StandardCopyOption;
    import java.util.Map;
    import java.util.Set;
    import java.util.UUID;
    import org.springframework.security.access.prepost.PreAuthorize;
    import org.springframework.web.bind.annotation.PostMapping;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RequestParam;
    import org.springframework.web.bind.annotation.RestController;
    import org.springframework.web.multipart.MultipartFile;

    @RestController
    @RequestMapping("/api/admin/content/upload")
    @PreAuthorize("hasRole('admin')")
    public class FileUploadController {{
        private static final Set<String> ALLOWED = Set.of("image/jpeg", "image/png", "image/webp");

        @PostMapping("/image")
        public ApiResponse<Map<String, String>> upload(@RequestParam("file") MultipartFile file) throws IOException {{
            if (file.isEmpty()) throw new BadRequestException("File is required");
            if (!ALLOWED.contains(file.getContentType())) throw new BadRequestException("Only JPG, PNG, and WEBP images are accepted");
            if (file.getSize() > 5 * 1024 * 1024) throw new BadRequestException("Maximum image size is 5MB");
            String extension = switch (file.getContentType()) {{
                case "image/png" -> ".png";
                case "image/webp" -> ".webp";
                default -> ".jpg";
            }};
            Path dir = Path.of("uploads");
            Files.createDirectories(dir);
            Path target = dir.resolve(UUID.randomUUID() + extension);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return ApiResponse.success(Map.of("imgUrl", "/uploads/" + target.getFileName()));
        }}
    }}
    """)


def generate_report_ai_notification() -> None:
    for module in ["report-service", "ai-service"]:
        write(ROOT / module / "pom.xml", pom_service(module, db=True))
        generate_config(module, db=True)
    pkg = f"{GROUP_ID}.{package_name('report-service')}"
    base = ROOT / "report-service" / "src/main/java" / pkg.replace(".", "/")
    write(base / "controller/ReportController.java", f"""
    package {pkg}.controller;

    import com.coffee.common.exception.BadRequestException;
    import com.coffee.common.response.ApiResponse;
    import java.nio.charset.StandardCharsets;
    import java.sql.Date;
    import java.time.LocalDate;
    import java.time.temporal.ChronoUnit;
    import java.util.List;
    import java.util.Map;
    import org.springframework.http.ContentDisposition;
    import org.springframework.http.HttpHeaders;
    import org.springframework.http.MediaType;
    import org.springframework.http.ResponseEntity;
    import org.springframework.jdbc.core.JdbcTemplate;
    import org.springframework.security.access.prepost.PreAuthorize;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RequestParam;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/api/admin/reports")
    @PreAuthorize("hasRole('admin')")
    public class ReportController {{
        private final JdbcTemplate jdbcTemplate;

        public ReportController(JdbcTemplate jdbcTemplate) {{
            this.jdbcTemplate = jdbcTemplate;
        }}

        @GetMapping("/revenue")
        public ApiResponse<?> revenue(@RequestParam(required = false) LocalDate fromDate, @RequestParam(required = false) LocalDate toDate, @RequestParam(required = false) Long branchId) {{
            validateRange(fromDate, toDate);
            String sql = "SELECT COUNT(*) totalOrders, COALESCE(SUM(p.amount),0) totalRevenue FROM Order_ o JOIN Payment p ON p.order_id=o.order_id WHERE o.status='completed' AND p.status='paid'";
            return ApiResponse.success(jdbcTemplate.queryForMap(sql));
        }}

        @GetMapping("/revenue/by-branch")
        public ApiResponse<?> revenueByBranch() {{
            return ApiResponse.success(jdbcTemplate.queryForList("SELECT o.branch_id branchId, COALESCE(SUM(p.amount),0) revenue FROM Order_ o JOIN Payment p ON p.order_id=o.order_id WHERE o.status='completed' AND p.status='paid' GROUP BY o.branch_id"));
        }}

        @GetMapping("/revenue/by-product")
        public ApiResponse<?> revenueByProduct() {{
            return ApiResponse.success(jdbcTemplate.queryForList("SELECT od.product_id productId, COALESCE(SUM(od.unit_price * od.quantity),0) revenue FROM Order_detail od JOIN Order_ o ON o.order_id=od.order_id WHERE o.status='completed' GROUP BY od.product_id"));
        }}

        @GetMapping("/inventory")
        public ApiResponse<?> inventory() {{
            return ApiResponse.success(jdbcTemplate.queryForList("SELECT branch_id branchId, ingredient_id ingredientId, quantity, min_quantity minQuantity, unit FROM Warehouse_stock"));
        }}

        @GetMapping("/orders")
        public ApiResponse<?> orders() {{
            return ApiResponse.success(jdbcTemplate.queryForList("SELECT status, COUNT(*) total FROM Order_ GROUP BY status"));
        }}

        @GetMapping("/customers")
        public ApiResponse<?> customers() {{
            return ApiResponse.success(jdbcTemplate.queryForList("SELECT status, COUNT(*) total FROM Customer GROUP BY status"));
        }}

        @GetMapping("/export/excel")
        public ResponseEntity<byte[]> excel() {{
            byte[] bytes = "metric,value\\nrevenue,0\\n".getBytes(StandardCharsets.UTF_8);
            return download(bytes, "reports.csv", "text/csv");
        }}

        @GetMapping("/export/pdf")
        public ResponseEntity<byte[]> pdf() {{
            byte[] bytes = "Coffee Chain Report Export".getBytes(StandardCharsets.UTF_8);
            return download(bytes, "reports.pdf", MediaType.APPLICATION_PDF_VALUE);
        }}

        private void validateRange(LocalDate fromDate, LocalDate toDate) {{
            if (fromDate != null && toDate != null && ChronoUnit.MONTHS.between(fromDate, toDate) > 12) {{
                throw new BadRequestException("Maximum query range is 12 months");
            }}
        }}

        private ResponseEntity<byte[]> download(byte[] bytes, String filename, String contentType) {{
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
                    .body(bytes);
        }}
    }}
    """)
    pkg = f"{GROUP_ID}.{package_name('ai-service')}"
    base = ROOT / "ai-service" / "src/main/java" / pkg.replace(".", "/")
    write(base / "controller/AiController.java", f"""
    package {pkg}.controller;

    import com.coffee.common.response.ApiResponse;
    import java.util.Map;
    import org.springframework.jdbc.core.JdbcTemplate;
    import org.springframework.security.access.prepost.PreAuthorize;
    import org.springframework.web.bind.annotation.GetMapping;
    import org.springframework.web.bind.annotation.PostMapping;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/api/admin/ai")
    @PreAuthorize("hasRole('admin')")
    public class AiController {{
        private final JdbcTemplate jdbcTemplate;

        public AiController(JdbcTemplate jdbcTemplate) {{
            this.jdbcTemplate = jdbcTemplate;
        }}

        @GetMapping("/dashboard")
        public ApiResponse<?> dashboard() {{
            return ApiResponse.success(Map.of("message", dataReadiness(), "confidenceScore", 0.72));
        }}

        @PostMapping("/demand-forecast")
        public ApiResponse<?> demandForecast() {{
            return ApiResponse.success(Map.of("message", dataReadiness(), "method", "moving_average", "confidenceScore", 0.68));
        }}

        @GetMapping("/stock-alerts")
        public ApiResponse<?> stockAlerts() {{
            return ApiResponse.success(jdbcTemplate.queryForList("SELECT * FROM Warehouse_stock WHERE quantity < min_quantity"));
        }}

        @PostMapping("/anomaly-detection")
        public ApiResponse<?> anomalyDetection() {{
            return ApiResponse.success(Map.of("revenueDrop", false, "cancellationSpike", false, "processingDelay", false, "confidenceScore", 0.64));
        }}

        @GetMapping("/menu-trends")
        public ApiResponse<?> menuTrends() {{
            return ApiResponse.success(jdbcTemplate.queryForList("SELECT product_id productId, SUM(quantity) quantity FROM Order_detail GROUP BY product_id ORDER BY quantity DESC LIMIT 10"));
        }}

        @GetMapping("/customer-behavior")
        public ApiResponse<?> customerBehavior() {{
            return ApiResponse.success(jdbcTemplate.queryForList("SELECT customer_id customerId, COUNT(*) orders FROM Order_ WHERE customer_id IS NOT NULL GROUP BY customer_id ORDER BY orders DESC LIMIT 10"));
        }}

        @GetMapping("/product-revenue-analysis")
        public ApiResponse<?> productRevenueAnalysis() {{
            return ApiResponse.success(jdbcTemplate.queryForList("SELECT product_id productId, SUM(unit_price * quantity) revenue FROM Order_detail GROUP BY product_id ORDER BY revenue DESC"));
        }}

        @GetMapping("/best-slow-products")
        public ApiResponse<?> bestSlowProducts() {{
            return ApiResponse.success(jdbcTemplate.queryForList("SELECT product_id productId, SUM(quantity) quantity FROM Order_detail GROUP BY product_id ORDER BY quantity DESC"));
        }}

        private String dataReadiness() {{
            Integer days = jdbcTemplate.queryForObject("SELECT COUNT(DISTINCT DATE(created_at)) FROM Order_", Integer.class);
            return days == null || days < 30 ? "Less than 30 days of data; returning rule-based analysis" : "Sufficient data for statistical analysis";
        }}
    }}
    """)
    module = "notification-service"
    write(ROOT / module / "pom.xml", pom_service(module, db=False))
    generate_config(module, db=False)
    pkg = f"{GROUP_ID}.{package_name(module)}"
    base = ROOT / module / "src/main/java" / pkg.replace(".", "/")
    write(base / "controller/NotificationController.java", f"""
    package {pkg}.controller;

    import com.coffee.common.response.ApiResponse;
    import java.util.Map;
    import org.slf4j.Logger;
    import org.slf4j.LoggerFactory;
    import org.springframework.web.bind.annotation.PostMapping;
    import org.springframework.web.bind.annotation.RequestBody;
    import org.springframework.web.bind.annotation.RequestMapping;
    import org.springframework.web.bind.annotation.RestController;

    @RestController
    @RequestMapping("/internal/notifications")
    public class NotificationController {{
        private static final Logger log = LoggerFactory.getLogger(NotificationController.class);

        @PostMapping("/email")
        public ApiResponse<Void> email(@RequestBody Map<String, Object> request) {{
            log.info("Mock email notification: {{}}", request);
            return ApiResponse.success("Email notification logged", null);
        }}

        @PostMapping("/system-alert")
        public ApiResponse<Void> systemAlert(@RequestBody Map<String, Object> request) {{
            log.info("Mock system alert: {{}}", request);
            return ApiResponse.success("System alert logged", null);
        }}
    }}
    """)


def generate_support_sql() -> None:
    write(ROOT / "database/V2__microservice_support_tables.sql", """
    CREATE TABLE IF NOT EXISTS refresh_token (
        token_id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
        employee_id BIGINT NOT NULL,
        token VARCHAR(500) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        revoked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_refresh_token_employee FOREIGN KEY (employee_id) REFERENCES Employee(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
        audit_id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
        actor_id BIGINT,
        actor_role VARCHAR(100),
        action VARCHAR(100) NOT NULL,
        target_table VARCHAR(100),
        target_id VARCHAR(100),
        reason VARCHAR(500),
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS role_permission (
        role_id BIGINT NOT NULL,
        permission_code VARCHAR(150) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (role_id, permission_code),
        CONSTRAINT fk_role_permission_role FOREIGN KEY (role_id) REFERENCES Role(role_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notification (
        notification_id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
        recipient_employee_id BIGINT,
        channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'system')),
        title VARCHAR(255),
        message TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS file_upload (
        file_id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
        original_name VARCHAR(255),
        stored_name VARCHAR(255) NOT NULL,
        content_type VARCHAR(100),
        size_bytes BIGINT,
        url VARCHAR(500) NOT NULL,
        uploaded_by BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS low_stock_alert (
        alert_id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
        stock_id BIGINT NOT NULL,
        branch_id BIGINT NOT NULL,
        ingredient_id BIGINT NOT NULL,
        quantity FLOAT NOT NULL,
        min_quantity FLOAT NOT NULL,
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_analysis_history (
        analysis_id BIGINT PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
        analysis_type VARCHAR(100) NOT NULL,
        input_params JSON,
        result JSON,
        confidence_score FLOAT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)


def generate_readme() -> None:
    services = "\n".join(f"- `{m}`: http://localhost:{PORTS[m]} (`/swagger-ui.html`)" for m in PORTS)
    write(ROOT / "README.md", f"""
    # Coffee Chain Management Backend

    This folder contains a Spring Boot 3.x Maven multi-module backend for the existing Admin React frontend.

    ## Modules

    {services}

    The API Gateway is the frontend entry point. Admin API prefixes are routed as requested:

    - `/api/auth/**` -> auth-service
    - `/api/admin/users/**` -> user-service
    - `/api/admin/branches/**`, `/api/admin/work-schedules/**` -> branch-service
    - `/api/admin/products/**` -> product-service
    - `/api/admin/inventory/**` -> inventory-service
    - `/api/admin/orders/**` -> order-service
    - `/api/admin/customers/**` -> customer-service
    - `/api/admin/promotions/**` -> promotion-service
    - `/api/admin/content/**` -> content-service
    - `/api/admin/reports/**` -> report-service
    - `/api/admin/ai/**` -> ai-service

    ## Database

    1. Create/import the existing schema:

       ```sql
       SOURCE database/do_an_lien_nganh.sql;
       ```

    2. Run the microservice support migration:

       ```sql
       SOURCE database/V2__microservice_support_tables.sql;
       ```

    No existing table names are renamed. JPA entities use the existing table and column names.

    ## Configuration

    All services read these environment variables:

    - `DB_URL` (default: `jdbc:postgresql://localhost:5432/do_an_lien_nganh`)
    - `DB_USERNAME` (default: `root`)
    - `DB_PASSWORD`
    - `JWT_SECRET`
    - `CORS_ALLOWED_ORIGINS` (default includes `http://localhost:5173`, `http://localhost:3000`, `http://localhost:4000`)

    Auth-service seeds an admin account if `admin@coffee.local` does not exist:

    - Email: `admin@coffee.local`
    - Password: `Admin@123`

    Override with `app.seed.admin-email` and `app.seed.admin-password`.

    ## Build

    ```powershell
    .\\mvnw.cmd -DskipTests package
    ```

    ## Run

    Start services in separate terminals. Example:

    ```powershell
    .\\mvnw.cmd -pl auth-service spring-boot:run
    .\\mvnw.cmd -pl user-service spring-boot:run
    .\\mvnw.cmd -pl api-gateway spring-boot:run
    ```

    The frontend should call the gateway at `http://localhost:4000`.

    ## Response Format

    Every controller returns:

    ```json
    {{
      "success": true,
      "message": "Success",
      "data": {{}},
      "errors": null,
      "timestamp": "2026-05-19T10:00:00"
    }}
    ```

    Validation and business exceptions return the same envelope with `success=false`.
    """)


def clean_generated_modules() -> None:
    for module in ALL_MODULES:
        path = ROOT / module
        if path.exists():
            shutil.rmtree(path)


def main() -> None:
    clean_generated_modules()
    write(ROOT / "pom.xml", pom_parent())
    generate_common()
    generate_gateway()
    for module in [m for m in SERVICE_TABLES if m != "auth-service"]:
        generate_module_scaffold(module)
        generate_entities_for_service(module)
        generate_crud_for_service(module)
    generate_module_scaffold("auth-service")
    generate_entities_for_service("auth-service")
    generate_auth_service()
    generate_user_extras()
    generate_branch_extras()
    generate_product_extras()
    generate_inventory_extras()
    generate_order_extras()
    generate_customer_extras()
    generate_promotion_extras()
    generate_content_extras()
    generate_report_ai_notification()
    generate_support_sql()
    generate_readme()


if __name__ == "__main__":
    main()
