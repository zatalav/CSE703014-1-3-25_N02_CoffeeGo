import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Search, X } from "lucide-react";
import { useCustomerMenu, type Product } from "../customerMenu";
import { ProductCard } from "../components/ProductCard";
import { ProductModal } from "../components/ProductModal";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { productImg } from "../data";
import { usePublicBanners } from "../content";

function normalizeMenuText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function productText(product: Product) {
  return normalizeMenuText([
    product.name,
    product.description,
    product.productType,
    product.kind,
    product.category,
    ...(product.badges || []),
  ].filter(Boolean).join(" "));
}

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

function uniqueProducts(products: Product[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

function isBestSeller(product: Product) {
  const text = productText(product);
  return includesAny(text, ["best", "bestseller", "ban chay", "hot"]);
}

function isSeasonal(product: Product) {
  const text = productText(product);
  return includesAny(text, ["seasonal", "mua vu", "mua he", "cold brew", "tra trai cay", "da xay"]);
}

export default function Menu() {
  const { categories, products, loading, error } = useCustomerMenu();
  const { banners } = usePublicBanners();
  const [active, setActive] = useState("");
  const [search, setSearch] = useState("");
  const [activeBanner, setActiveBanner] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const normalizedSearch = useMemo(() => normalizeMenuText(search), [search]);
  const menuBanners = useMemo(
    () => [...banners].sort((a, b) => a.position - b.position || a.bannerId - b.bannerId),
    [banners]
  );
  const heroImages = menuBanners.length
    ? menuBanners
    : [{ bannerId: 0, title: "Menu CoffeeGo", subtitle: "", imgUrl: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=2000&q=80", linkUrl: "/", position: 0 }];
  const categoryLabelById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.label])),
    [categories]
  );
  const filteredProducts = useMemo(() => {
    if (!normalizedSearch) return products;

    return products.filter((product) => {
      const categoryLabel = categoryLabelById.get(product.category) || "";
      return normalizeMenuText(`${product.name} ${product.description} ${categoryLabel}`).includes(normalizedSearch);
    });
  }, [categoryLabelById, normalizedSearch, products]);

  const sections = useMemo(
    () =>
      categories
        .map((category) => ({
          ...category,
          products: filteredProducts.filter((product) => product.category === category.id),
        }))
        .filter((section) => section.products.length > 0),
    [categories, filteredProducts]
  );

  const highlightSections = useMemo(() => {
    const regularProducts = filteredProducts.filter((product) => product.kind !== "combo");
    const explicitBestSellers = regularProducts.filter(isBestSeller);
    const explicitSeasonal = regularProducts.filter(isSeasonal);

    const bestSellerProducts = uniqueProducts(
      explicitBestSellers.length ? explicitBestSellers : regularProducts
    ).slice(0, 4);
    const seasonalProducts = uniqueProducts(
      explicitSeasonal.length ? explicitSeasonal : regularProducts
    ).slice(0, 4);

    return [
      { id: "highlight-bestseller", label: "Bestseller", products: bestSellerProducts },
      { id: "highlight-seasonal", label: "Sản phẩm mùa", products: seasonalProducts },
    ].filter((section) => section.products.length > 0);
  }, [filteredProducts]);

  const displaySections = useMemo(
    () => [...highlightSections, ...sections],
    [highlightSections, sections]
  );

  useEffect(() => {
    if (displaySections.length && !displaySections.some((section) => section.id === active)) {
      setActive(displaySections[0].id);
    }
  }, [active, displaySections]);

  useEffect(() => {
    setActiveBanner(0);
  }, [menuBanners.length]);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveBanner((index) => (index + 1) % heroImages.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [heroImages.length]);

  const scrollToCategory = (categoryId: string) => {
    setActive(categoryId);
    document.getElementById(`menu-${categoryId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
  };

  return (
    <div>
      <section className="relative flex h-[40vh] items-end overflow-hidden">
        <div className="absolute inset-0">
          {heroImages.map((banner, index) => (
            <ImageWithFallback
              key={`${banner.bannerId}-${banner.imgUrl}`}
              src={banner.bannerId ? productImg(banner.imgUrl) : banner.imgUrl}
              alt={banner.title || "Menu CoffeeGo"}
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out"
              style={{ opacity: index === activeBanner ? 0.6 : 0 }}
            />
          ))}
        </div>
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 30%, var(--bg-primary) 100%)" }} />
        <div className="relative mx-auto w-full max-w-7xl px-6 pb-10">
          <div className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>
            <Link to="/" className="hover:underline">Trang chủ</Link> / Menu
          </div>
          <h1 className="mt-2" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}>Thực Đơn</h1>
          <p className="italic" style={{ color: "var(--text-secondary)" }}>Đậm đà từng ngụm, thuần Việt từng hương.</p>
        </div>
        {heroImages.length > 1 && (
          <div className="absolute bottom-5 right-6 flex gap-2">
            {heroImages.map((banner, index) => (
              <button
                key={`dot-${banner.bannerId}-${index}`}
                type="button"
                aria-label={`Banner ${index + 1}`}
                onClick={() => setActiveBanner(index)}
                className="h-2.5 w-2.5 rounded-full transition"
                style={{ background: index === activeBanner ? "var(--brand-brown)" : "rgba(92,51,23,0.28)" }}
              />
            ))}
          </div>
        )}
      </section>

      {displaySections.length > 0 && (
        <div className="sticky top-20 z-40 py-4" style={{ background: "rgba(250,246,240,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border-line)" }}>
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {displaySections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToCategory(section.id)}
                  className="whitespace-nowrap rounded-full px-5 py-2 text-sm transition ui-text flex-shrink-0"
                  style={{
                    background: active === section.id ? "var(--brand-brown)" : "transparent",
                    color: active === section.id ? "var(--bg-primary)" : "var(--text-secondary)",
                    border: "1px solid " + (active === section.id ? "var(--brand-brown)" : "var(--border-line)"),
                  }}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10">
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3rem)" }}>
            Tất cả món CoffeeGo
          </h2>
          <p className="mt-2 max-w-2xl" style={{ color: "var(--text-secondary)" }}>
            Các món được sắp theo từng danh mục để khách dễ xem từ bán chạy, món mùa vụ, combo đến đồ uống và bánh.
          </p>
          <div className="mt-6 max-w-xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: "var(--text-secondary)" }} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm sản phẩm"
                className="w-full rounded-xl py-3 pl-11 pr-11 text-sm outline-none"
                style={{ background: "white", border: "1px solid var(--border-line)", color: "var(--text-primary)" }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition hover:bg-[--bg-card]"
                  type="button"
                  aria-label="Xóa tìm kiếm"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="aspect-[3/4] animate-pulse rounded-2xl" style={{ background: "var(--bg-card)" }} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl p-6 text-sm" style={{ background: "white", border: "1px solid var(--border-line)", color: "var(--error)" }}>
            {error}
          </div>
        )}

        {!loading && !error && displaySections.length === 0 && (
          <div className="rounded-2xl p-6 text-sm" style={{ background: "white", border: "1px solid var(--border-line)", color: "var(--text-secondary)" }}>
            {normalizedSearch ? "Không tìm thấy sản phẩm phù hợp." : "Chưa có sản phẩm đang bán trong CSDL."}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-14">
            {displaySections.map((section) => (
              <section key={section.id} id={`menu-${section.id}`} className="scroll-mt-36">
                <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "2rem" }}>{section.label}</h3>
                  </div>
                  <div className="h-px flex-1 sm:ml-6" style={{ background: "var(--border-line)" }} />
                </div>
                <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
                  {section.products.map((product) => (
                    <ProductCard
                      key={`${section.id}-${product.id}`}
                      product={product}
                      onClick={() => openProduct(product)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          menuProducts={products}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
