package com.coffee.inventoryservice.controller;

import com.coffee.common.security.AuthenticatedUser;
import java.text.Normalizer;
import java.util.Locale;
import org.springframework.security.access.AccessDeniedException;

final class InventoryBranchScope {
    private InventoryBranchScope() {
    }

    static Long scopedBranchId(AuthenticatedUser user) {
        return isBranchScopedRole(user) ? user.getBranchId() : null;
    }

    static boolean isBranchManager(AuthenticatedUser user) {
        String role = normalizedRole(user);
        return "branch manager".equals(role)
                || role.contains("quan ly chi nhanh")
                || role.contains("quan ly ban hang")
                || role.contains("sales manager")
                || role.contains("sale manager");
    }

    static boolean isWarehouseManager(AuthenticatedUser user) {
        String role = normalizedRole(user);
        return "warehouse manager".equals(role)
                || role.contains("quan ly kho");
    }

    static boolean isAdmin(AuthenticatedUser user) {
        String role = normalizedRole(user);
        return "admin".equals(role) || role.contains("administrator");
    }

    private static boolean isBranchScopedRole(AuthenticatedUser user) {
        return isWarehouseManager(user) || isBranchManager(user);
    }

    private static String normalizedRole(AuthenticatedUser user) {
        if (user == null || user.getRoleName() == null) {
            return "";
        }
        return Normalizer.normalize(user.getRoleName(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replace('_', ' ')
                .trim();
    }

    static void requireSameBranch(Long actualBranchId, AuthenticatedUser user, String message) {
        Long scopedBranchId = scopedBranchId(user);
        if (scopedBranchId != null && !scopedBranchId.equals(actualBranchId)) {
            throw new AccessDeniedException(message);
        }
    }
}
