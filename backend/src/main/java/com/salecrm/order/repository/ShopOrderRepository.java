package com.salecrm.order.repository;

import com.salecrm.order.entity.ShopOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ShopOrderRepository extends JpaRepository<ShopOrder, Long> {

    boolean existsByOrderCode(String orderCode);

    Optional<ShopOrder> findByOrderCodeIgnoreCase(String orderCode);

    Optional<ShopOrder> findByOrderCodeIgnoreCaseAndPhone(String orderCode, String phone);

    List<ShopOrder> findAllByOrderByCreatedAtDesc();

    long countByStatus(String status);
}
