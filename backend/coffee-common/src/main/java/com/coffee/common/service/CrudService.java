package com.coffee.common.service;

    import com.coffee.common.response.PageResponse;
    import java.util.Map;
    import org.springframework.data.domain.Pageable;

    public interface CrudService<REQ, RESP, ID> {
        PageResponse<RESP> list(String keyword, Map<String, String> filters, Pageable pageable);
        RESP get(ID id);
        RESP create(REQ request);
        RESP update(ID id, REQ request);
        void delete(ID id);
        RESP setStatus(ID id, String status);
    }
