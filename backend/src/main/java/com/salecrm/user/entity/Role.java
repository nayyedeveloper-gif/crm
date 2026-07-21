package com.salecrm.user.entity;

/**
 * ADMIN   - headquarters; can access all branches.
 * MANAGER - branch manager; own branch, or all branches when branch is unset.
 * STAFF   - branch staff; own branch, or all branches when branch is unset.
 */
public enum Role {
    ADMIN,
    MANAGER,
    STAFF;

    public String authority() {
        return "ROLE_" + name();
    }

    public boolean isCrossBranch() {
        return this == ADMIN;
    }
}
