package com.coffee.productservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.productservice.dto.request.RecipeDetailRequest;
import com.coffee.productservice.dto.response.RecipeDetailResponse;
import com.coffee.productservice.entity.RecipeDetail;
import com.coffee.productservice.mapper.RecipeDetailMapper;
import com.coffee.productservice.repository.RecipeDetailRepository;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/products/recipe-details")
public class RecipeDetailController {
    private final RecipeDetailRepository repository;
    private final RecipeDetailMapper mapper;

    public RecipeDetailController(RecipeDetailRepository repository, RecipeDetailMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    @GetMapping
    public ApiResponse<List<RecipeDetailResponse>> list(@RequestParam(required = false) Long recipeId) {
        return ApiResponse.success(repository.findAll().stream()
                .filter(item -> recipeId == null || recipeId.equals(item.getRecipeId()))
                .map(mapper::toResponse)
                .toList());
    }

    @PostMapping
    public ApiResponse<RecipeDetailResponse> create(@Valid @RequestBody RecipeDetailRequest request) {
        return ApiResponse.success("Created", mapper.toResponse(repository.save(mapper.toEntity(request))));
    }

    @PutMapping("/{id}")
    public ApiResponse<RecipeDetailResponse> update(@PathVariable Long id, @Valid @RequestBody RecipeDetailRequest request) {
        RecipeDetail entity = repository.findById(id).orElseThrow();
        mapper.updateEntity(entity, request);
        return ApiResponse.success("Updated", mapper.toResponse(repository.save(entity)));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        repository.deleteById(id);
        return ApiResponse.success("Deleted", null);
    }
}
