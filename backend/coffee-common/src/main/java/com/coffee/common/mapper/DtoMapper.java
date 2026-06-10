package com.coffee.common.mapper;

    public interface DtoMapper<E, REQ, RESP> {
        E toEntity(REQ request);
        void updateEntity(E entity, REQ request);
        RESP toResponse(E entity);
    }
