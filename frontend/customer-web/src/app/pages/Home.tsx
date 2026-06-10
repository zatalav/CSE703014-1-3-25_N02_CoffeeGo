import { Link } from "react-router";
import { ArrowRight, ChevronDown, Coffee } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { productImg } from "../data";
import { ProductCard } from "../components/ProductCard";
import { useCustomerMenu } from "../customerMenu";
import { usePublicContent } from "../content";

export default function Home() {
  const { products, loading, error } = useCustomerMenu();
  const { banners, news: contentNews, loading: contentLoading, error: contentError } = usePublicContent();
  const featured = products.filter((product) => product.badges?.length).slice(0, 4);
  const visibleFeatured = featured.length ? featured : products.slice(0, 4);
  const promoBanner = banners[0];
  const latestNews = contentNews.slice(0, 3);

  return (
    <div>
      <section className="relative flex h-[86vh] min-h-[620px] items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1453614512568-c4024d13c247?auto=format&fit=crop&w=2000&q=80"
            alt="CoffeeGo"
            className="w-full h-full object-cover"
            style={{ opacity: 0.55 }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #FAF6F0 5%, transparent 50%, #FAF6F0 95%)" }} />
        </div>
        <div className="relative text-center px-6 max-w-4xl">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6" style={{ background: "var(--brand-brown)", boxShadow: "0 0 60px rgba(92,51,23,0.3)" }}>
            <Coffee size={48} style={{ color: "var(--bg-primary)" }} />
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.5rem, 6vw, 5.5rem)", lineHeight: 1.1, color: "var(--text-primary)", fontWeight: 700 }}>
            Cà phê Việt<br /><em style={{ color: "var(--brand-brown)" }}>Hương vị đời thường</em>
          </h1>
          <p className="mt-6 text-lg max-w-2xl mx-auto" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
            Từ hạt Arabica Cầu Đất đến ly phin buổi sáng của bạn, mỗi ngụm là một khoảnh khắc Việt.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/products" className="px-8 py-3.5 rounded-full ui-text font-semibold transition hover:scale-105 hover:shadow-lg" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}>
              Đặt hàng ngay
            </Link>
            <Link to="/products" className="px-8 py-3.5 rounded-full ui-text font-semibold transition hover:bg-[--glass-bg]" style={{ border: "1.5px solid var(--brand-brown)", color: "var(--brand-brown)" }}>
              Xem menu
            </Link>
          </div>
          <ChevronDown className="absolute -bottom-32 left-1/2 -translate-x-1/2 animate-bounce" size={32} style={{ color: "var(--brand-brown)" }} />
        </div>
      </section>

      <section className="py-20 px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="text-sm ui-text mb-3" style={{ color: "var(--brand-hover)" }}>VỀ COFFEEGO</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3.5rem)" }}>Góc cà phê <em style={{ color: "var(--brand-brown)" }}>của bạn</em></h2>
          <p className="mt-4 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            CoffeeGo ra đời từ niềm yêu mến với ly phin nóng buổi sáng. Chúng tôi mang đến không gian thân quen, hương vị thuần Việt và từng ngụm đậm đà bản sắc.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { n: "15+", l: "Chi nhánh" },
              { n: "50+", l: "Thức uống" },
              { n: "200K+", l: "Khách hàng" },
            ].map((s) => (
              <div key={s.l}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", color: "var(--brand-brown)", fontWeight: 700 }}>{s.n}</div>
                <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="aspect-[4/5] overflow-hidden" style={{ clipPath: "polygon(0 5%, 100% 0, 100% 95%, 0 100%)" }}>
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=80"
            alt="Quán CoffeeGo"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      <section className="py-20 px-6" style={{ background: "var(--bg-section)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-sm ui-text mb-3" style={{ color: "var(--brand-hover)" }}>SIGNATURE</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3.5rem)" }}>Đặc trưng <em style={{ color: "var(--brand-brown)" }}>CoffeeGo</em></h2>
          </div>
          {loading && (
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="aspect-[3/4] animate-pulse rounded-2xl" style={{ background: "var(--bg-card)" }} />
              ))}
            </div>
          )}
          {!loading && error && (
            <div className="rounded-2xl p-6 text-sm" style={{ background: "white", border: "1px solid var(--border-line)", color: "var(--error)" }}>
              {error}
            </div>
          )}
          {!loading && !error && visibleFeatured.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {visibleFeatured.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          <div className="text-center mt-10">
            <Link to="/products" className="inline-flex items-center gap-2 px-6 py-3 rounded-full ui-text transition hover:bg-[--bg-card]" style={{ border: "1.5px solid var(--brand-brown)", color: "var(--brand-brown)" }}>
              Xem thêm <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {(contentLoading || promoBanner) && (
        <section className="py-20 px-6 max-w-7xl mx-auto">
          {contentLoading && (
            <div className="h-[400px] animate-pulse rounded-3xl" style={{ background: "var(--bg-card)" }} />
          )}
          {!contentLoading && promoBanner && (
            <div className="rounded-3xl overflow-hidden relative h-[400px] flex items-center" style={{ background: "linear-gradient(135deg, #5C3317 0%, #8B4513 100%)" }}>
              <ImageWithFallback
                src={productImg(promoBanner.imgUrl)}
                alt={promoBanner.title}
                className="absolute inset-0 w-full h-full object-cover opacity-35"
              />
              <div className="relative p-10 md:p-16 max-w-2xl" style={{ color: "var(--bg-primary)" }}>
                <div className="ui-text text-sm mb-3 opacity-80">BANNER</div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3rem)", color: "white" }}>{promoBanner.title}</h2>
                {promoBanner.subtitle && <p className="mt-3 opacity-90">{promoBanner.subtitle}</p>}
                <Link to={promoBanner.linkUrl || "/"} className="inline-block mt-6 px-6 py-3 rounded-full ui-text font-semibold transition hover:scale-105" style={{ background: "var(--bg-primary)", color: "var(--brand-brown)" }}>
                  Xem ngay
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-sm ui-text mb-3" style={{ color: "var(--brand-hover)" }}>CHUYỆN COFFEEGO</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3.5rem)" }}>Tin tức <em style={{ color: "var(--brand-brown)" }}>mới nhất</em></h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {contentLoading && Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="aspect-[4/3] animate-pulse rounded-2xl" style={{ background: "var(--bg-card)" }} />
          ))}
          {!contentLoading && contentError && (
            <div className="md:col-span-3 rounded-2xl p-6 text-sm" style={{ background: "white", border: "1px solid var(--border-line)", color: "var(--error)" }}>
              {contentError}
            </div>
          )}
          {!contentLoading && !contentError && latestNews.length === 0 && (
            <div className="md:col-span-3 rounded-2xl p-6 text-center text-sm" style={{ background: "white", border: "1px solid var(--border-line)", color: "var(--text-secondary)" }}>
              Chưa có tin tức đã xuất bản.
            </div>
          )}
          {!contentLoading && !contentError && latestNews.map((n) => (
            <Link key={n.slug} to={`/news/${n.slug}`} className="group rounded-2xl overflow-hidden transition hover:-translate-y-1" style={{ background: "white", border: "1px solid var(--border-line)" }}>
              <div className="aspect-video overflow-hidden" style={{ background: "var(--bg-card)" }}>
                <ImageWithFallback src={productImg(n.image)} alt={n.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              </div>
              <div className="p-5">
                <div className="text-xs ui-text mb-2" style={{ color: "var(--brand-hover)" }}>{n.category}{n.date ? ` - ${n.date}` : ""}</div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>{n.title}</h3>
                <p className="text-sm mt-2 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{n.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/news" className="inline-flex items-center gap-2 ui-text" style={{ color: "var(--brand-brown)" }}>
            Xem tất cả <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-sm ui-text mb-3" style={{ color: "var(--brand-hover)" }}>KHÔNG GIAN</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3.5rem)" }}>Góc <em style={{ color: "var(--brand-brown)" }}>của bạn</em></h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px]">
          {[
            { img: "photo-1453614512568-c4024d13c247", span: "row-span-2" },
            { img: "photo-1495474472287-4d71bcdd2085", span: "" },
            { img: "photo-1442975631115-c4f7b05b8a2c", span: "" },
            { img: "photo-1554118811-1e0d58224f24", span: "row-span-2" },
            { img: "/customer-assets/coffee-shop-corner.png", span: "" },
            { img: "photo-1521017432531-fbd92d768814", span: "" },
          ].map((g, i) => (
            <div key={i} className={"rounded-2xl overflow-hidden " + g.span}>
              <ImageWithFallback src={productImg(g.img)} alt="" className="w-full h-full object-cover hover:scale-105 transition duration-500" />
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link to="/stores" className="inline-flex items-center gap-2 px-6 py-3 rounded-full ui-text transition hover:scale-105" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}>
            Tìm quán gần nhất <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
