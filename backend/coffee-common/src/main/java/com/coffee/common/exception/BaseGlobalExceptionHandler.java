package com.coffee.common.exception;

    import com.coffee.common.response.ApiResponse;
    import com.coffee.common.response.ErrorDetail;
    import jakarta.validation.ConstraintViolationException;
    import java.util.List;
    import org.springframework.http.HttpStatus;
    import org.springframework.http.ResponseEntity;
    import org.springframework.http.converter.HttpMessageNotReadableException;
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

        @ExceptionHandler(HttpMessageNotReadableException.class)
        public ResponseEntity<ApiResponse<Void>> unreadable(HttpMessageNotReadableException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Malformed JSON request", null));
        }

        @ExceptionHandler(Exception.class)
        public ResponseEntity<ApiResponse<Void>> general(Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(ex.getMessage(), null));
        }
    }
