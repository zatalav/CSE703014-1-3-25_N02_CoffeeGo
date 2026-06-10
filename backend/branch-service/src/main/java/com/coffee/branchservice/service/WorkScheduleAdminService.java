package com.coffee.branchservice.service;

import com.coffee.common.service.CrudService;
import com.coffee.branchservice.dto.request.WorkScheduleRequest;
import com.coffee.branchservice.dto.response.WorkScheduleResponse;

public interface WorkScheduleAdminService extends CrudService<WorkScheduleRequest, WorkScheduleResponse, Long> {
}
