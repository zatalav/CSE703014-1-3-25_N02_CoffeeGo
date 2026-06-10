package com.coffee.branchservice.service.impl;

import com.coffee.common.service.CrudServiceSupport;
import com.coffee.branchservice.entity.Branch;
import com.coffee.branchservice.mapper.BranchMapper;
import com.coffee.branchservice.repository.BranchRepository;
import com.coffee.branchservice.dto.request.BranchRequest;
import com.coffee.branchservice.dto.response.BranchResponse;
import com.coffee.branchservice.service.BranchAdminService;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class BranchAdminServiceImpl extends CrudServiceSupport<Branch, Long, BranchRequest, BranchResponse> implements BranchAdminService {
    public BranchAdminServiceImpl(BranchRepository repository, BranchMapper mapper) {
        super(repository, repository, mapper, Branch.class, "branch_id", List.of("branchName", "address", "email"), Map.of("status", "status", "branchType", "branchType", "branchId", "branchId"), null);
    }
}
