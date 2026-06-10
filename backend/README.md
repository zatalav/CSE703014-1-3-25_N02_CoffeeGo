# Coffee Chain Management Backend

    This folder contains a Spring Boot 3.x Maven multi-module backend for the existing Admin React frontend.

    ## Modules

    - `api-gateway`: http://localhost:8080 (`/swagger-ui.html`)
- `auth-service`: http://localhost:8081 (`/swagger-ui.html`)
- `user-service`: http://localhost:8082 (`/swagger-ui.html`)
- `branch-service`: http://localhost:8083 (`/swagger-ui.html`)
- `product-service`: http://localhost:8084 (`/swagger-ui.html`)
- `inventory-service`: http://localhost:8085 (`/swagger-ui.html`)
- `order-service`: http://localhost:8086 (`/swagger-ui.html`)
- `customer-service`: http://localhost:8087 (`/swagger-ui.html`)
- `promotion-service`: http://localhost:8088 (`/swagger-ui.html`)
- `content-service`: http://localhost:8089 (`/swagger-ui.html`)
- `report-service`: http://localhost:8090 (`/swagger-ui.html`)
- `ai-service`: http://localhost:8091 (`/swagger-ui.html`)
- `notification-service`: http://localhost:8092 (`/swagger-ui.html`)

    The API Gateway is the frontend entry point. Admin API prefixes are routed as requested:

    - `/api/auth/**` -> auth-service
    - `/api/admin/users/**` -> user-service
    - `/api/branches/**`, `/api/admin/branches/**`, `/api/admin/work-schedules/**` -> branch-service
    - `/api/admin/products/**` -> product-service
    - `/api/admin/inventory/**` -> inventory-service
    - `/api/admin/orders/**` -> order-service
    - `/api/admin/customers/**` -> customer-service
    - `/api/admin/promotions/**` -> promotion-service
    - `/api/admin/content/**` -> content-service
    - `/api/admin/reports/**` -> report-service
    - `/api/admin/ai/**` -> ai-service

    ## Database

    The repository no longer stores SQL dump/migration files. Create or import the MySQL database
    `do_an_lien_nganh` directly in MySQL, then configure each service through its
    `src/main/resources/application.properties` file.

    No existing table names are renamed. JPA entities use the existing table and column names.

    ## Configuration

    All database-backed services now use `application.properties` and read these required environment variables:

    - `DB_URL`
    - `DB_USERNAME`
    - `DB_PASSWORD`
    - `JWT_SECRET`
    - `CORS_ALLOWED_ORIGINS` (default includes `http://localhost:5173`, `http://localhost:3000`, `http://localhost:4000`, `http://localhost:8080`)

    Shipping integration with GHN sandbox is handled by `order-service`. Configure these environment variables before
    creating delivery orders:

    - `GHN_TOKEN`
    - `GHN_SHOP_ID`
    - `GHN_API_URL` (default `https://dev-online-gateway.ghn.vn/shiip/public-api`)
    - `GHN_FROM_NAME`, `GHN_FROM_PHONE`, `GHN_FROM_ADDRESS`, `GHN_FROM_WARD_NAME`, `GHN_FROM_DISTRICT_NAME`, `GHN_FROM_PROVINCE_NAME`

    Configure the SQL connection once in:

    ```powershell
    .\configure-sql-env.ps1
    ```

    Edit `$DbUrl`, `$DbUsername`, and `$DbPassword`, then run it before starting services. Use `-PersistUser` if you want Windows to remember these variables for future terminals.

    Content image uploads use Cloudinary. Configure Cloudinary once in:

    ```powershell
    .\configure-cloudinary-env.ps1
    ```

    Edit `$CloudinaryCloudName`, `$CloudinaryApiKey`, `$CloudinaryApiSecret`, and `$CloudinaryFolder`, then run it before starting `content-service`. Use `-PersistUser` if you want Windows to remember these variables.

    Auth-service seeds an admin account if `admin@coffee.local` does not exist.
    The login form also accepts `Admin` as an alias for this email:

    - Account: `Admin`
    - Password: `Admin`

    Override with `app.seed.admin-email` and `app.seed.admin-password`.

    ## Build

    ```powershell
    .\mvnw.cmd -DskipTests package
    ```

    ## Run

    Start services in separate terminals. Example:

    ```powershell
    .\mvnw.cmd -pl auth-service spring-boot:run
    .\mvnw.cmd -pl user-service spring-boot:run
    .\mvnw.cmd -pl api-gateway spring-boot:run
    ```

    The frontend should call the gateway at `http://localhost:8080/api`.

    ## Response Format

    Every controller returns:

    ```json
    {
      "success": true,
      "message": "Success",
      "data": {},
      "errors": null,
      "timestamp": "2026-05-19T10:00:00"
    }
    ```

    Validation and business exceptions return the same envelope with `success=false`.
