package com.coffee.contentservice.controller;

import com.coffee.common.response.ApiResponse;
import com.coffee.contentservice.dto.response.BannerResponse;
import com.coffee.contentservice.dto.response.NewsResponse;
import com.coffee.contentservice.entity.Banner;
import com.coffee.contentservice.entity.News;
import com.coffee.contentservice.mapper.BannerMapper;
import com.coffee.contentservice.mapper.NewsMapper;
import com.coffee.contentservice.repository.BannerRepository;
import com.coffee.contentservice.repository.NewsRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/content")
public class PublicContentController {
    private final BannerRepository bannerRepository;
    private final BannerMapper bannerMapper;
    private final NewsRepository newsRepository;
    private final NewsMapper newsMapper;

    public PublicContentController(BannerRepository bannerRepository,
                                   BannerMapper bannerMapper,
                                   NewsRepository newsRepository,
                                   NewsMapper newsMapper) {
        this.bannerRepository = bannerRepository;
        this.bannerMapper = bannerMapper;
        this.newsRepository = newsRepository;
        this.newsMapper = newsMapper;
    }

    @GetMapping("/banners")
    public ApiResponse<List<BannerResponse>> banners() {
        List<BannerResponse> banners = bannerRepository.findAll().stream()
                .filter(banner -> isPublicStatus(banner.getStatus(), "active"))
                .sorted(Comparator
                        .comparing(Banner::getPosition, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(Banner::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(bannerMapper::toResponse)
                .toList();
        return ApiResponse.success(banners);
    }

    @GetMapping("/news")
    public ApiResponse<List<NewsResponse>> news() {
        List<NewsResponse> news = newsRepository.findAll().stream()
                .filter(item -> isPublicStatus(item.getStatus(), "published"))
                .sorted(Comparator.comparing(
                        News::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(newsMapper::toResponse)
                .toList();
        return ApiResponse.success(news);
    }

    private boolean isPublicStatus(String status, String preferred) {
        if (status == null || status.isBlank()) {
            return true;
        }
        String value = status.trim().toLowerCase(Locale.ROOT);
        return value.equals(preferred) || value.equals("active") || value.equals("published");
    }
}
