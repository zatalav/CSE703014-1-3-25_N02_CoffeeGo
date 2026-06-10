package com.coffee.contentservice.repository;

import com.coffee.contentservice.entity.News;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface NewsRepository extends JpaRepository<News, Long>, JpaSpecificationExecutor<News> {
    Optional<News> findBySlug(String slug);
    boolean existsBySlug(String slug);
}
