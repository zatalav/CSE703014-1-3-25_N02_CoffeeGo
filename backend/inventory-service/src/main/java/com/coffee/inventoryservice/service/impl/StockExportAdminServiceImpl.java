package com.coffee.inventoryservice.service.impl;

import com.coffee.common.exception.BadRequestException;
import com.coffee.common.response.PageResponse;
import com.coffee.common.service.CrudServiceSupport;
import com.coffee.inventoryservice.dto.request.StockExportDetailRequest;
import com.coffee.inventoryservice.dto.request.StockExportRequest;
import com.coffee.inventoryservice.dto.response.StockExportResponse;
import com.coffee.inventoryservice.entity.StockExport;
import com.coffee.inventoryservice.entity.StockExportDetail;
import com.coffee.inventoryservice.entity.WarehouseStock;
import com.coffee.inventoryservice.mapper.StockExportDetailMapper;
import com.coffee.inventoryservice.mapper.StockExportMapper;
import com.coffee.inventoryservice.repository.IngredientRepository;
import com.coffee.inventoryservice.repository.StockExportDetailRepository;
import com.coffee.inventoryservice.repository.StockExportRepository;
import com.coffee.inventoryservice.repository.WarehouseStockRepository;
import com.coffee.inventoryservice.service.StockExportAdminService;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StockExportAdminServiceImpl extends CrudServiceSupport<StockExport, Long, StockExportRequest, StockExportResponse> implements StockExportAdminService {
    private final StockExportRepository repository;
    private final StockExportMapper mapper;
    private final StockExportDetailRepository detailRepository;
    private final StockExportDetailMapper detailMapper;
    private final WarehouseStockRepository stockRepository;
    private final IngredientRepository ingredientRepository;

    public StockExportAdminServiceImpl(
            StockExportRepository repository,
            StockExportMapper mapper,
            StockExportDetailRepository detailRepository,
            StockExportDetailMapper detailMapper,
            WarehouseStockRepository stockRepository,
            IngredientRepository ingredientRepository
    ) {
        super(repository, repository, mapper, StockExport.class, "export_id", List.of("note"), Map.of("fromBranchId", "fromBranchId", "toBranchId", "toBranchId", "employeeId", "employeeId"), "exportedAt");
        this.repository = repository;
        this.mapper = mapper;
        this.detailRepository = detailRepository;
        this.detailMapper = detailMapper;
        this.stockRepository = stockRepository;
        this.ingredientRepository = ingredientRepository;
    }

    @Override
    public PageResponse<StockExportResponse> list(String keyword, Map<String, String> filters, Pageable pageable) {
        PageResponse<StockExportResponse> page = super.list(keyword, filters, pageable);
        page.getItems().forEach(this::attachDetails);
        return page;
    }

    @Override
    public StockExportResponse get(Long id) {
        return attachDetails(super.get(id));
    }

    @Override
    @Transactional
    public StockExportResponse create(StockExportRequest request) {
        validateDetails(request.getFromBranchId(), request.getDetails());
        if (request.getExportedAt() == null) {
            request.setExportedAt(LocalDateTime.now());
        }

        StockExport saved = repository.save(mapper.toEntity(request));
        for (StockExportDetailRequest detailRequest : request.getDetails()) {
            detailRequest.setExportId(saved.getExportId());
            StockExportDetail detail = detailRepository.save(detailMapper.toEntity(detailRequest));
            decreaseSourceStock(saved.getFromBranchId(), detail.getIngredientId(), detail.getQuantity());
            increaseTargetStock(saved.getToBranchId(), detail.getIngredientId(), detail.getQuantity(), detail.getUnit());
        }

        return attachDetails(mapper.toResponse(saved));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        StockExport entity = find(id);
        List<StockExportDetail> details = detailRepository.findByExportIdOrderByExportDetailIdAsc(id);
        for (StockExportDetail detail : details) {
            increaseTargetStock(entity.getFromBranchId(), detail.getIngredientId(), detail.getQuantity(), detail.getUnit());
            decreaseTargetStock(entity.getToBranchId(), detail.getIngredientId(), detail.getQuantity());
        }
        detailRepository.deleteByExportId(id);
        repository.delete(entity);
    }

    private StockExportResponse attachDetails(StockExportResponse response) {
        response.setDetails(detailRepository.findByExportIdOrderByExportDetailIdAsc(response.getExportId()).stream()
                .map(detailMapper::toResponse)
                .toList());
        return response;
    }

    private void validateDetails(Long fromBranchId, List<StockExportDetailRequest> details) {
        if (details == null || details.isEmpty()) {
            throw new BadRequestException("Phieu xuat phai co it nhat mot mat hang");
        }

        Map<Long, Double> requiredByIngredient = new HashMap<>();
        for (StockExportDetailRequest detail : details) {
            if (detail.getIngredientId() == null || !ingredientRepository.existsById(detail.getIngredientId())) {
                throw new BadRequestException("Nguyen lieu trong phieu xuat khong hop le");
            }
            if (detail.getQuantity() == null || detail.getQuantity() <= 0) {
                throw new BadRequestException("So luong xuat phai lon hon 0");
            }
            if (detail.getUnit() == null || detail.getUnit().isBlank()) {
                throw new BadRequestException("Don vi tinh khong duoc de trong");
            }
            if (detail.getUnitPrice() == null || detail.getUnitPrice() < 0) {
                throw new BadRequestException("Don gia xuat khong hop le");
            }
            requiredByIngredient.merge(detail.getIngredientId(), detail.getQuantity(), Double::sum);
        }

        requiredByIngredient.forEach((ingredientId, requiredQuantity) -> {
            double currentQuantity = stockRepository.findByBranchIdAndIngredientIdOrderByStockIdAsc(fromBranchId, ingredientId).stream()
                    .mapToDouble(stock -> safeQuantity(stock.getQuantity()))
                    .sum();
            if (currentQuantity < requiredQuantity) {
                throw new BadRequestException("So luong xuat vuot ton kho hien co");
            }
        });
    }

    private void decreaseSourceStock(Long branchId, Long ingredientId, Double quantity) {
        double remaining = quantity;
        List<WarehouseStock> stocks = stockRepository.findByBranchIdAndIngredientIdOrderByStockIdAsc(branchId, ingredientId);
        for (WarehouseStock stock : stocks) {
            if (remaining <= 0) {
                break;
            }
            double current = safeQuantity(stock.getQuantity());
            double used = Math.min(current, remaining);
            stock.setQuantity(current - used);
            remaining -= used;
            stockRepository.save(stock);
        }
    }

    private void increaseTargetStock(Long branchId, Long ingredientId, Double quantity, String unit) {
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

    private void decreaseTargetStock(Long branchId, Long ingredientId, Double quantity) {
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
