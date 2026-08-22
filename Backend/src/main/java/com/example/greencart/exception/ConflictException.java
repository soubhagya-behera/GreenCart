package com.example.greencart.exception;

// 409 Conflict — e.g. two delivery partners accepting the same order.
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
