package com.coffee.authservice.repository;

    import com.coffee.authservice.entity.RefreshToken;
    import java.util.Optional;
    import org.springframework.data.jpa.repository.JpaRepository;
    import org.springframework.stereotype.Repository;

    @Repository
    public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
        Optional<RefreshToken> findByTokenAndRevokedFalse(String token);
        void deleteByEmployeeId(Long employeeId);
    }
