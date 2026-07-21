package com.salecrm.branch.controller;

import com.salecrm.branch.dto.BranchRequest;
import com.salecrm.branch.dto.BranchResponse;
import com.salecrm.branch.service.BranchService;
import com.salecrm.common.web.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/branches")
@RequiredArgsConstructor
public class BranchController {

    private final BranchService branchService;

    /** Active branches for filters / dropdowns (cross-branch users). */
    @GetMapping
    @PreAuthorize("@perm.can('BRANCH_ALL')")
    public ApiResponse<List<BranchResponse>> activeBranches() {
        return ApiResponse.ok(branchService.findAllActive());
    }

    /** All branches including inactive — for Branch / Shop management. */
    @GetMapping("/all")
    @PreAuthorize("@perm.can('BRANCHES_MANAGE')")
    public ApiResponse<List<BranchResponse>> allBranches() {
        return ApiResponse.ok(branchService.findAll());
    }

    @PostMapping
    @PreAuthorize("@perm.can('BRANCHES_MANAGE')")
    public ApiResponse<BranchResponse> create(@Valid @RequestBody BranchRequest request) {
        return ApiResponse.ok(branchService.create(request), "Branch created");
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perm.can('BRANCHES_MANAGE')")
    public ApiResponse<BranchResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody BranchRequest request) {
        return ApiResponse.ok(branchService.update(id, request), "Branch updated");
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.can('BRANCHES_MANAGE')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        branchService.delete(id);
        return ApiResponse.ok(null, "Branch deleted");
    }
}
