package com.coffee.userservice.dto.response;

public class LookupOptionResponse {
    private Long id;
    private String name;
    private String group;
    private String status;

    public LookupOptionResponse() {
    }

    public LookupOptionResponse(Long id, String name, String group, String status) {
        this.id = id;
        this.name = name;
        this.group = group;
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

    public String getGroup() {
        return group;
    }

    public void setGroup(String group) {
        this.group = group;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
