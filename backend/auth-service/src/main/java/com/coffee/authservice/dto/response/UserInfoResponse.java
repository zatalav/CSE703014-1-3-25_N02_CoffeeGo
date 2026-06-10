package com.coffee.authservice.dto.response;

    public class UserInfoResponse {
        private Long id;
        private String name;
        private String email;
        private String phoneNumber;
        private String roleName;
        private Long branchId;
        private String status;
        private Integer expPoints;
        private Integer dripPoints;
        private String tier;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPhoneNumber() { return phoneNumber; }
        public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
        public String getRoleName() { return roleName; }
        public void setRoleName(String roleName) { this.roleName = roleName; }
        public Long getBranchId() { return branchId; }
        public void setBranchId(Long branchId) { this.branchId = branchId; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public Integer getExpPoints() { return expPoints; }
        public void setExpPoints(Integer expPoints) { this.expPoints = expPoints; }
        public Integer getDripPoints() { return dripPoints; }
        public void setDripPoints(Integer dripPoints) { this.dripPoints = dripPoints; }
        public String getTier() { return tier; }
        public void setTier(String tier) { this.tier = tier; }
    }
