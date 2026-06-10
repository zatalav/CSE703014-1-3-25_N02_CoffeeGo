package com.coffee.branchservice.service;

import com.coffee.branchservice.dto.request.BranchHoursRequest;
import com.coffee.branchservice.dto.request.BranchRequest;
import com.coffee.branchservice.dto.response.BranchHoursResponse;
import com.coffee.branchservice.dto.response.BranchResponse;
import com.coffee.common.response.PageResponse;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Pageable;

public interface BranchService {
    PageResponse<BranchResponse> list(String keyword, Map<String, String> filters, Pageable pageable);
    BranchResponse get(Long id);
    BranchResponse create(BranchRequest request);
    BranchResponse update(Long id, BranchRequest request);
    void delete(Long id);
    List<BranchHoursResponse> getHours(Long branchId);
    List<BranchHoursResponse> updateHours(Long branchId, List<BranchHoursRequest> requests);
}
