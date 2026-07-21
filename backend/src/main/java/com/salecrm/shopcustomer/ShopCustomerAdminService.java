package com.salecrm.shopcustomer;

import com.salecrm.common.exception.ResourceNotFoundException;
import com.salecrm.common.web.PageResponse;
import com.salecrm.shopcustomer.dto.ShopCustomerAdminUpdateRequest;
import com.salecrm.shopcustomer.dto.ShopCustomerResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ShopCustomerAdminService {

    private final ShopCustomerRepository customerRepository;

    @Transactional(readOnly = true)
    public PageResponse<ShopCustomerResponse> search(
            String q,
            ShopCustomerTier tier,
            Boolean trusted,
            Boolean active,
            int page,
            int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        var pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        String query = StringUtils.hasText(q) ? q.trim() : null;
        return PageResponse.of(
                customerRepository.search(query, tier, trusted, active, pageable),
                ShopCustomerResponse::from);
    }

    @Transactional(readOnly = true)
    public ShopCustomerResponse get(Long id) {
        return ShopCustomerResponse.from(require(id));
    }

    @Transactional
    public ShopCustomerResponse update(Long id, ShopCustomerAdminUpdateRequest req) {
        ShopCustomer c = require(id);
        c.setCustomerTier(req.customerTier());
        c.setTrusted(Boolean.TRUE.equals(req.trusted()));
        c.setActive(Boolean.TRUE.equals(req.active()));
        if (req.crmNote() != null) {
            String note = req.crmNote().trim();
            c.setCrmNote(note.isEmpty() ? null : note);
        }
        return ShopCustomerResponse.from(customerRepository.save(c));
    }

    @Transactional(readOnly = true)
    public Map<String, Long> stats() {
        Map<String, Long> stats = new LinkedHashMap<>();
        stats.put("total", customerRepository.count());
        stats.put("active", customerRepository.countByActiveTrue());
        stats.put("trusted", customerRepository.countByTrustedTrue());
        stats.put("customer", customerRepository.countByCustomerTier(ShopCustomerTier.CUSTOMER));
        stats.put("vip", customerRepository.countByCustomerTier(ShopCustomerTier.VIP));
        stats.put("vvip", customerRepository.countByCustomerTier(ShopCustomerTier.VVIP));
        return stats;
    }

    private ShopCustomer require(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShopCustomer", id));
    }
}
