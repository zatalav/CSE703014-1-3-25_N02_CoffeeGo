package com.coffee.customerservice.repository;

import com.coffee.customerservice.entity.DripsVoucher;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface DripsVoucherRepository extends JpaRepository<DripsVoucher, Long>, JpaSpecificationExecutor<DripsVoucher> {
}
