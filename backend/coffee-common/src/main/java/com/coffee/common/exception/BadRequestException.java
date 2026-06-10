package com.coffee.common.exception;

        public class BadRequestException extends RuntimeException {
            public BadRequestException(String message) {
                super(message);
            }
        }
