package com.coffee.apigateway.config;

    import java.util.HashMap;
    import java.util.Map;
    import org.springframework.boot.context.properties.ConfigurationProperties;
    import org.springframework.context.annotation.Configuration;

    @Configuration
    @ConfigurationProperties(prefix = "app")
    public class RouteProperties {
        private Map<String, String> routes = new HashMap<>();

        public Map<String, String> getRoutes() {
            return routes;
        }

        public void setRoutes(Map<String, String> routes) {
            this.routes = routes;
        }
    }
