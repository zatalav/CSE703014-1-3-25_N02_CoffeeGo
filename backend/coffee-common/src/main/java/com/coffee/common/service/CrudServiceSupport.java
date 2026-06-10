package com.coffee.common.service;

    import com.coffee.common.exception.BadRequestException;
    import com.coffee.common.exception.ResourceNotFoundException;
    import com.coffee.common.mapper.DtoMapper;
    import com.coffee.common.response.PageResponse;
    import jakarta.persistence.criteria.Predicate;
    import java.lang.reflect.Field;
    import java.time.LocalDate;
    import java.time.LocalDateTime;
    import java.time.LocalTime;
    import java.util.ArrayList;
    import java.util.List;
    import java.util.Map;
    import org.springframework.data.domain.Page;
    import org.springframework.data.domain.Pageable;
    import org.springframework.data.jpa.domain.Specification;
    import org.springframework.data.jpa.repository.JpaRepository;
    import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

    public abstract class CrudServiceSupport<E, ID, REQ, RESP> implements CrudService<REQ, RESP, ID> {
        private final JpaRepository<E, ID> repository;
        private final JpaSpecificationExecutor<E> specifications;
        private final DtoMapper<E, REQ, RESP> mapper;
        private final Class<E> entityClass;
        private final String idLabel;
        private final List<String> keywordFields;
        private final Map<String, String> filterAliases;
        private final String dateField;

        protected CrudServiceSupport(
                JpaRepository<E, ID> repository,
                JpaSpecificationExecutor<E> specifications,
                DtoMapper<E, REQ, RESP> mapper,
                Class<E> entityClass,
                String idLabel,
                List<String> keywordFields,
                Map<String, String> filterAliases,
                String dateField
        ) {
            this.repository = repository;
            this.specifications = specifications;
            this.mapper = mapper;
            this.entityClass = entityClass;
            this.idLabel = idLabel;
            this.keywordFields = keywordFields;
            this.filterAliases = filterAliases;
            this.dateField = dateField;
        }

        @Override
        public PageResponse<RESP> list(String keyword, Map<String, String> filters, Pageable pageable) {
            Page<RESP> page = specifications.findAll(buildSpec(keyword, filters), pageable).map(mapper::toResponse);
            return PageResponse.from(page);
        }

        @Override
        public RESP get(ID id) {
            return mapper.toResponse(find(id));
        }

        @Override
        public RESP create(REQ request) {
            E entity = mapper.toEntity(request);
            return mapper.toResponse(repository.save(entity));
        }

        @Override
        public RESP update(ID id, REQ request) {
            E entity = find(id);
            mapper.updateEntity(entity, request);
            return mapper.toResponse(repository.save(entity));
        }

        @Override
        public void delete(ID id) {
            E entity = find(id);
            repository.delete(entity);
        }

        @Override
        public RESP setStatus(ID id, String status) {
            E entity = find(id);
            if (!hasField("status")) {
                throw new BadRequestException("This resource does not support status changes");
            }
            setField(entity, "status", status);
            return mapper.toResponse(repository.save(entity));
        }

        protected E find(ID id) {
            return repository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException(entityClass.getSimpleName() + " not found: " + idLabel + "=" + id));
        }

        private Specification<E> buildSpec(String keyword, Map<String, String> filters) {
            return (root, query, cb) -> {
                List<Predicate> predicates = new ArrayList<>();
                if (hasField("status") && !"deleted".equalsIgnoreCase(filters.get("status"))) {
                    predicates.add(cb.notEqual(cb.lower(root.get("status").as(String.class)), "deleted"));
                }

                if (keyword != null && !keyword.isBlank() && !keywordFields.isEmpty()) {
                    String like = "%" + keyword.toLowerCase() + "%";
                    List<Predicate> ors = new ArrayList<>();
                    for (String field : keywordFields) {
                        if (hasField(field)) {
                            ors.add(cb.like(cb.lower(root.get(field).as(String.class)), like));
                        }
                    }
                    if (!ors.isEmpty()) {
                        predicates.add(cb.or(ors.toArray(Predicate[]::new)));
                    }
                }

                filters.forEach((key, value) -> {
                    if (value == null || value.isBlank() || "all".equalsIgnoreCase(value)) {
                        return;
                    }
                    if ("fromDate".equals(key) || "toDate".equals(key)) {
                        return;
                    }
                    String field = filterAliases.getOrDefault(key, key);
                    if (!hasField(field)) {
                        return;
                    }
                    predicates.add(cb.equal(root.get(field), convertValue(field, value)));
                });

                if (dateField != null && hasField(dateField)) {
                    String from = filters.get("fromDate");
                    String to = filters.get("toDate");
                    if (from != null && !from.isBlank()) {
                        predicates.add(cb.greaterThanOrEqualTo(root.get(dateField), convertDateValue(dateField, from, true)));
                    }
                    if (to != null && !to.isBlank()) {
                        predicates.add(cb.lessThanOrEqualTo(root.get(dateField), convertDateValue(dateField, to, false)));
                    }
                }
                return cb.and(predicates.toArray(Predicate[]::new));
            };
        }

        @SuppressWarnings({"unchecked", "rawtypes"})
        private Comparable convertDateValue(String fieldName, String value, boolean startOfDay) {
            Class<?> type = fieldType(fieldName);
            LocalDate date = LocalDate.parse(value);
            if (LocalDateTime.class.equals(type)) {
                return startOfDay ? date.atStartOfDay() : date.atTime(LocalTime.MAX);
            }
            return date;
        }

        private Object convertValue(String fieldName, String value) {
            Class<?> type = fieldType(fieldName);
            if (Long.class.equals(type)) return Long.valueOf(value);
            if (Integer.class.equals(type)) return Integer.valueOf(value);
            if (Double.class.equals(type)) return Double.valueOf(value);
            if (Boolean.class.equals(type)) return Boolean.valueOf(value);
            if (LocalDate.class.equals(type)) return LocalDate.parse(value);
            if (LocalDateTime.class.equals(type)) return LocalDate.parse(value).atStartOfDay();
            return value;
        }

        private boolean hasField(String fieldName) {
            try {
                entityClass.getDeclaredField(fieldName);
                return true;
            } catch (NoSuchFieldException ex) {
                return false;
            }
        }

        private Class<?> fieldType(String fieldName) {
            try {
                return entityClass.getDeclaredField(fieldName).getType();
            } catch (NoSuchFieldException ex) {
                return String.class;
            }
        }

        private void setField(E entity, String fieldName, Object value) {
            try {
                Field field = entityClass.getDeclaredField(fieldName);
                field.setAccessible(true);
                field.set(entity, value);
            } catch (ReflectiveOperationException ex) {
                throw new BadRequestException("Cannot update field " + fieldName);
            }
        }
    }
