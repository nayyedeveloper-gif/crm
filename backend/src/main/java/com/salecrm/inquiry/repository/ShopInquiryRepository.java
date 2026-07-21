package com.salecrm.inquiry.repository;

import com.salecrm.inquiry.entity.ShopInquiry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShopInquiryRepository extends JpaRepository<ShopInquiry, Long> {

    List<ShopInquiry> findAllByOrderByCreatedAtDesc();

    long countByStatus(String status);
}
