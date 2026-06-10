package com.coffee.inventoryservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class SupplierFormRequest {
    @NotBlank
    @Size(max = 100)
    private String supplierName;

    @NotBlank
    @Size(max = 255)
    private String address;

    private String status;
    private String contactPerson;
    private String phone;
    private String email;
    private Integer deliveryTime;
    private Double moqValue;
    private String moqUnit;
    private String note;
    private String urlImg;

    public String getSupplierName() {
        return supplierName;
    }

    public void setSupplierName(String supplierName) {
        this.supplierName = supplierName;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getContactPerson() {
        return contactPerson;
    }

    public void setContactPerson(String contactPerson) {
        this.contactPerson = contactPerson;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Integer getDeliveryTime() {
        return deliveryTime;
    }

    public void setDeliveryTime(Integer deliveryTime) {
        this.deliveryTime = deliveryTime;
    }

    public Double getMoqValue() {
        return moqValue;
    }

    public void setMoqValue(Double moqValue) {
        this.moqValue = moqValue;
    }

    public String getMoqUnit() {
        return moqUnit;
    }

    public void setMoqUnit(String moqUnit) {
        this.moqUnit = moqUnit;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public String getUrlImg() {
        return urlImg;
    }

    public void setUrlImg(String urlImg) {
        this.urlImg = urlImg;
    }
}
