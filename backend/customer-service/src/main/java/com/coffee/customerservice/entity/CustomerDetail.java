package com.coffee.customerservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "Customer_detail")
public class CustomerDetail {

    @Id
    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @Column(name = "address", length = 500)
    private String address;

    @Column(name = "address_label", length = 100)
    private String addressLabel;

    @Column(name = "address_detail", length = 255)
    private String addressDetail;

    @Column(name = "address_ward", length = 100)
    private String addressWard;

    @Column(name = "address_district", length = 100)
    private String addressDistrict;

    @Column(name = "address_province", length = 100)
    private String addressProvince;

    @Column(name = "address_ward_code")
    private Integer addressWardCode;

    @Column(name = "address_district_code")
    private Integer addressDistrictCode;

    @Column(name = "address_province_code")
    private Integer addressProvinceCode;

    @Column(name = "address_lat")
    private Double addressLat;

    @Column(name = "address_lng")
    private Double addressLng;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public CustomerDetail() {}

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getAddressLabel() {
        return addressLabel;
    }

    public void setAddressLabel(String addressLabel) {
        this.addressLabel = addressLabel;
    }

    public String getAddressDetail() {
        return addressDetail;
    }

    public void setAddressDetail(String addressDetail) {
        this.addressDetail = addressDetail;
    }

    public String getAddressWard() {
        return addressWard;
    }

    public void setAddressWard(String addressWard) {
        this.addressWard = addressWard;
    }

    public String getAddressDistrict() {
        return addressDistrict;
    }

    public void setAddressDistrict(String addressDistrict) {
        this.addressDistrict = addressDistrict;
    }

    public String getAddressProvince() {
        return addressProvince;
    }

    public void setAddressProvince(String addressProvince) {
        this.addressProvince = addressProvince;
    }

    public Integer getAddressWardCode() {
        return addressWardCode;
    }

    public void setAddressWardCode(Integer addressWardCode) {
        this.addressWardCode = addressWardCode;
    }

    public Integer getAddressDistrictCode() {
        return addressDistrictCode;
    }

    public void setAddressDistrictCode(Integer addressDistrictCode) {
        this.addressDistrictCode = addressDistrictCode;
    }

    public Integer getAddressProvinceCode() {
        return addressProvinceCode;
    }

    public void setAddressProvinceCode(Integer addressProvinceCode) {
        this.addressProvinceCode = addressProvinceCode;
    }

    public Double getAddressLat() {
        return addressLat;
    }

    public void setAddressLat(Double addressLat) {
        this.addressLat = addressLat;
    }

    public Double getAddressLng() {
        return addressLng;
    }

    public void setAddressLng(Double addressLng) {
        this.addressLng = addressLng;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

}
