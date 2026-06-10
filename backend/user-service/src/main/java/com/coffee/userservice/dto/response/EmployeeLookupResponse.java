package com.coffee.userservice.dto.response;

public class EmployeeLookupResponse {
    private Long id;
    private String name;
    private Long branchId;
    private Long roleId;
    private String roleName;
    private String status;

    public EmployeeLookupResponse() {
    }

    public EmployeeLookupResponse(Long id, String name, Long branchId, Long roleId, String roleName, String status) {
        this.id = id;
        this.name = name;
        this.branchId = branchId;
        this.roleId = roleId;
        this.roleName = roleName;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public Long getRoleId() {
        return roleId;
    }

    public void setRoleId(Long roleId) {
        this.roleId = roleId;
    }

    public String getRoleName() {
        return roleName;
    }

    public void setRoleName(String roleName) {
        this.roleName = roleName;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
