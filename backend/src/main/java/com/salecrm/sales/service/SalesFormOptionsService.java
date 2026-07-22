package com.salecrm.sales.service;

import com.salecrm.sales.dto.SalesFormOptionsResponse;
import com.salecrm.sales.repository.SalesTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SalesFormOptionsService {

    private static final List<String> DEFAULT_ITEM_MAIN_GROUPS = List.of(
            "Gold", "Diamond", "Platinum", "Silver", "Gem", "Accessory", "Other"
    );

    private static final List<String> DEFAULT_ITEM_CATEGORIES = List.of(
            "Ring", "Necklace", "Bracelet", "Earring", "Pendant", "Bangle", "Chain", "Set", "Other"
    );

    private static final List<String> DEFAULT_PURITIES = List.of(
            "၁၅ ပဲရည်", "၁၆ ပဲရည်", "၁၈ ပဲရည်", "PT", "Diamond"
    );

    private static final List<String> DEFAULT_REASONS = List.of(
            "G Sale", "Dia Sale", "PT Sale", "Sale",
            "G RC", "Dia RC", "PT RC",
            "G RP", "Dia RP", "PT RP"
    );

    private static final List<String> CUSTOMER_TYPES = List.of("New", "Old");
    private static final List<String> NEW_RETURN = List.of("New", "Return");
    private static final List<String> TRANSACTION_TYPES = List.of("Sale", "RC", "RP", "Exchange", "Other");
    private static final List<String> PREFIXES = List.of("Mr", "Mrs", "Ms", "Dr", "U", "Daw", "Mg", "Ma");
    private static final List<String> ON_OFF = List.of("ON", "OFF");
    private static final List<String> ITEM_TYPES = List.of("Gold", "Diamond", "Platinum", "Mixed", "Other");
    private static final List<String> KEY_ACCOUNT = List.of("Yes", "No");

    private final SalesTransactionRepository transactionRepository;

    @Transactional(readOnly = true)
    public SalesFormOptionsResponse options() {
        return new SalesFormOptionsResponse(
                merge(DEFAULT_ITEM_MAIN_GROUPS, transactionRepository.findDistinctItemMainGroups()),
                merge(DEFAULT_ITEM_CATEGORIES, transactionRepository.findDistinctItemCategories()),
                merge(DEFAULT_PURITIES, transactionRepository.findDistinctPurities()),
                merge(DEFAULT_REASONS, transactionRepository.findDistinctReasons()),
                CUSTOMER_TYPES,
                NEW_RETURN,
                TRANSACTION_TYPES,
                PREFIXES,
                ON_OFF,
                ITEM_TYPES,
                KEY_ACCOUNT,
                transactionRepository.findDistinctSalesStaff()
        );
    }

    private static List<String> merge(List<String> defaults, List<String> fromDb) {
        Set<String> merged = new LinkedHashSet<>(defaults);
        if (fromDb != null) {
            for (String value : fromDb) {
                if (value != null && !value.isBlank()) {
                    merged.add(value.trim());
                }
            }
        }
        return new ArrayList<>(merged);
    }
}
