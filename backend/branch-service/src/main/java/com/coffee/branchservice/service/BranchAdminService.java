package com.coffee.branchservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.branchservice.dto.request.BranchRequest;
import com.coffee.branchservice.dto.response.BranchResponse;

public interface BranchAdminService extends CrudService<BranchRequest, BranchResponse, Long> {
}
