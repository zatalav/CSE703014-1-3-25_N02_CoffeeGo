package com.coffee.inventoryservice.service.impl;

import com.coffee.common.exception.BadRequestException;
import com.coffee.common.response.PageResponse;
import com.coffee.common.service.CrudServiceSupport;
import com.coffee.inventoryservice.dto.request.StockImportDetailRequest;
import com.coffee.inventoryservice.dto.request.StockImportRequest;
import com.coffee.inventoryservice.dto.response.StockImportResponse;
import com.coffee.inventoryservice.entity.StockImport;
import com.coffee.inventoryservice.entity.StockImportDetail;
import com.coffee.inventoryservice.entity.WarehouseStock;
import com.coffee.inventoryservice.mapper.StockImportDetailMapper;
import com.coffee.inventoryservice.mapper.StockImportMapper;
import com.coffee.inventoryservice.repository.IngredientRepository;
import com.coffee.inventoryservice.repository.StockImportDetailRepository;
import com.coffee.inventoryservice.repository.StockImportRepository;
import com.coffee.inventoryservice.repository.WarehouseStockRepository;
import com.coffee.inventoryservice.service.StockImportAdminService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StockImportAdminServiceImpl extends CrudServiceSupport<StockImport, Long, StockImportRequest, StockImportResponse> implements StockImportAdminService {
    private final StockImportRepository repository;
    private final StockImportMapper mapper;
    private final StockImportDetailRepository detailRepository;
    private final StockImportDetailMapper detailMapper;
    private final WarehouseStockRepository stockRepository;
    private final IngredientRepository ingredientRepository;

    public StockImportAdminServiceImpl(
            StockImportRepository repository,
            StockImportMapper mapper,
            StockImportDetailRepository detailRepository,
            StockImportDetailMapper detailMapper,
            WarehouseStockRepository stockRepository,
            IngredientRepository ingredientRepository
    ) {
        super(repository, repository, mapper, StockImport.class, "import_id", List.of("note"), Map.of("branchId", "branchId", "supplierId", "supplierId", "employeeId", "employeeId"), "importedAt");
        this.repository = repository;
        this.mapper = mapper;
        this.detailRepository = detailRepository;
        this.detailMapper = detailMapper;
        this.stockRepository = stockRepository;
        this.ingredientRepository = ingredientRepository;
    }

    @Override
    public PageResponse<StockImportResponse> list(String keyword, Map<String, String> filters, Pageable pageable) {
        PageResponse<StockImportResponse> page = super.list(keyword, filters, pageable);
        page.getItems().forEach(this::attachDetails);
        return page;
    }

    @Override
    public StockImportResponse get(Long id) {
        return attachDetails(super.get(id));
    }

    @Override
    @Transactional
    public StockImportResponse create(StockImportRequest request) {
        validateDetails(request.getDetails());
        if (request.getImportedAt() == null) {
            request.setImportedAt(LocalDateTime.now());
        }

        StockImport saved = repository.save(mapper.toEntity(request));
        for (StockImportDetailRequest detailRequest : request.getDetails()) {
            detailRequest.setImportId(saved.getImportId());
            StockImportDetail detail = detailRepository.save(detailMapper.toEntity(detailRequest));
            increaseStock(saved.getBranchId(), detail.getIngredientId(), detail.getQuantity(), detail.getUnit());
        }

        return attachDetails(mapper.toResponse(saved));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        StockImport entity = find(id);
        List<StockImportDetail> details = detailRepository.findByImportIdOrderByImportDetailIdAsc(id);
        for (StockImportDetail detail : details) {
            decreaseStock(entity.getBranchId(), detail.getIngredientId(), detail.getQuantity());
        }
        detailRepository.deleteByImportId(id);
        repository.delete(entity);
    }

    private StockImportResponse attachDetails(StockImportResponse response) {
        response.setDetails(detailRepository.findByImportIdOrderByImportDetailIdAsc(response.getImportId()).stream()
                .map(detailMapper::toResponse)
                .toList());
        return response;
    }

    private void validateDetails(List<StockImportDetailRequest> details) {
        if (details == null || details.isEmpty()) {
            throw new BadRequestException("Phieu nhap phai co it nhat mot mat hang");
        }
        for (StockImportDetailRequest detail : details) {
            if (detail.getIngredientId() == null || !ingredientRepository.existsById(detail.getIngredientId())) {
                throw new BadRequestException("Nguyen lieu trong phieu nhap khong hop le");
            }
            if (detail.getQuantity() == null || detail.getQuantity() <= 0) {
                throw new BadRequestException("So luong nhap phai lon hon 0");
            }
            if (detail.getUnit() == null || detail.getUnit().isBlank()) {
                throw new BadRequestException("Don vi tinh khong duoc de trong");
            }
            if (detail.getUnitPrice() == null || detail.getUnitPrice() < 0) {
                throw new BadRequestException("Don gia nhap khong hop le");
            }
        }
    }

    private void increaseStock(Long branchId, Long ingredientId, Double quantity, String unit) {
        WarehouseStock stock = stockRepository.findFirstByBranchIdAndIngredientIdOrderByStockIdAsc(branchId, ingredientId)
                .orElseGet(() -> {
                    WarehouseStock created = new WarehouseStock();
                    created.setBranchId(branchId);
                    created.setIngredientId(ingredientId);
                    created.setQuantity(0.0);
                    created.setMinQuantity(0.0);
                    created.setUnit(unit);
                    return created;
                });
        stock.setQuantity(safeQuantity(stock.getQuantity()) + quantity);
        if (stock.getUnit() == null || stock.getUnit().isBlank()) {
            stock.setUnit(unit);
        }
        if (stock.getMinQuantity() == null) {
            stock.setMinQuantity(0.0);
        }
        stockRepository.save(stock);
    }

    private void decreaseStock(Long branchId, Long ingredientId, Double quantity) {
        WarehouseStock stock = stockRepository.findFirstByBranchIdAndIngredientIdOrderByStockIdAsc(branchId, ingredientId)
                .orElse(null);
        if (stock == null) {
            return;
        }
        stock.setQuantity(Math.max(0.0, safeQuantity(stock.getQuantity()) - quantity));
        stockRepository.save(stock);
    }

    private double safeQuantity(Double value) {
        return value == null ? 0.0 : value;
    }
}
