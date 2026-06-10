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
