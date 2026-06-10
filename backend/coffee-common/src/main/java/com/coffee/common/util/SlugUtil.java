package com.coffee.common.util;

    import java.text.Normalizer;
    import java.util.Locale;

    public final class SlugUtil {
        private SlugUtil() {}

        public static String slugify(String value) {
            if (value == null || value.isBlank()) {
                return "untitled";
            }
            String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                    .replaceAll("\\p{M}", "")
                    .toLowerCase(Locale.ROOT)
                    .replaceAll("[^a-z0-9]+", "-")
                    .replaceAll("(^-|-$)", "");
            return normalized.isBlank() ? "untitled" : normalized;
        }
    }
