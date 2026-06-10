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
