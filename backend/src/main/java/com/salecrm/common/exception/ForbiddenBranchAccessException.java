package com.salecrm.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Raised when a user tries to read/modify data belonging to a branch they are not allowed to access.
 */
public class ForbiddenBranchAccessException extends BusinessException {
    public ForbiddenBranchAccessException() {
        super("You do not have access to this branch's data.", HttpStatus.FORBIDDEN);
    }
}
