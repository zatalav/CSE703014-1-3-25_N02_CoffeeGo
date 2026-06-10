import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Clock, Calendar } from "lucide-react";
import { productImg } from "../data";
import { usePublicNews } from "../content";

const allCategory = "Tất cả";

export function NewsList() {
  const [cat, setCat] = useState(allCategory);
  const { news, loading, error } = usePublicNews();
  const categories = useMemo(() => [allCategory, ...Array.from(new Set(news.map((n) => n.category).filter(Boolean)))], [news]);
  const filtered = cat === allCategory ? news : news.filter((n) => n.category === cat);
  const featured = filtered[0];

  return (
    <div>
      <section className="relative h-[35vh] flex items-end overflow-hidden">
        <ImageWithFallback
          src={productImg(featured?.image || "photo-1495474472287-4d71bcdd2085")}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.55 }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 30%, var(--bg-primary) 100%)" }} />
        <div className="relative max-w-7xl mx-auto px-6 pb-8 w-full">
          <div className="text-xs ui-text" style={{ color: "var(--text-secondary)" }}>
            <Link to="/">Trang chủ</Link> &gt; Tin tức
          </div>
          <h1 className="mt-2" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>Chuyện CoffeeGo</h1>
          <p className="italic" style={{ color: "var(--text-secondary)" }}>Tin mới, ưu đãi và câu chuyện mùa hè từ CoffeeGo</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex gap-2 flex-wrap mb-8">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className="px-5 py-2 rounded-full text-sm ui-text transition"
              style={{
                background: cat === c ? "var(--brand-brown)" : "transparent",
                color: cat === c ? "var(--bg-primary)" : "var(--text-secondary)",
                border: "1px solid " + (cat === c ? "var(--brand-brown)" : "var(--border-line)"),
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {loading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="aspect-[4/3] animate-pulse rounded-2xl" style={{ background: "var(--bg-card)" }} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl p-6 text-sm" style={{ background: "white", border: "1px solid var(--border-line)", color: "var(--error)" }}>
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl p-8 text-center text-sm" style={{ background: "white", border: "1px solid var(--border-line)", color: "var(--text-secondary)" }}>
            Chưa có tin tức đã xuất bản trong danh mục này.
          </div>
        )}

        {!loading && !error && featured && (
          <Link to={`/news/${featured.slug}`} className="block rounded-3xl overflow-hidden mb-10 grid md:grid-cols-2 group" style={{ background: "white", border: "1px solid var(--border-line)" }}>
            <div className="aspect-video md:aspect-auto overflow-hidden" style={{ background: "var(--bg-card)" }}>
              <ImageWithFallback src={productImg(featured.image)} alt={featured.title} className="w-full h-full object-cover transition group-hover:scale-105" />
            </div>
            <div className="p-8 flex flex-col justify-center">
              <div className="text-xs ui-text mb-3" style={{ color: "var(--brand-hover)" }}>{featured.category}</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.8rem, 3vw, 2.5rem)" }}>{featured.title}</h2>
              <p className="mt-3" style={{ color: "var(--text-secondary)" }}>{featured.excerpt}</p>
              <div className="flex items-center gap-4 mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                {featured.date && <span className="flex items-center gap-1"><Calendar size={14} />{featured.date}</span>}
                <span className="flex items-center gap-1"><Clock size={14} />{featured.readTime} phút đọc</span>
              </div>
              <div className="mt-5 ui-text" style={{ color: "var(--brand-brown)" }}>Đọc thêm -&gt;</div>
            </div>
          </Link>
        )}

        {!loading && !error && filtered.length > 1 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.slice(1).map((n) => (
              <Link key={n.slug} to={`/news/${n.slug}`} className="group rounded-2xl overflow-hidden transition hover:-translate-y-1" style={{ background: "white", border: "1px solid var(--border-line)" }}>
                <div className="aspect-video overflow-hidden" style={{ background: "var(--bg-card)" }}>
                  <ImageWithFallback src={productImg(n.image)} alt={n.title} className="w-full h-full object-cover transition group-hover:scale-105" />
                </div>
                <div className="p-5">
                  <div className="text-xs ui-text mb-2" style={{ color: "var(--brand-hover)" }}>{n.category}{n.date ? ` - ${n.date}` : ""}</div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>{n.title}</h3>
                  <p className="text-sm mt-2 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{n.excerpt}</p>
                  <div className="text-xs mt-3 flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
                    <Clock size={12} />{n.readTime} phút đọc
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function NewsDetail() {
  const { slug } = useParams();
  const { news, loading, error } = usePublicNews();
  const article = news.find((n) => n.slug === slug);
  const related = news.filter((n) => n.slug !== slug).slice(0, 3);

  if (loading) {
    return <div className="p-20 text-center" style={{ color: "var(--text-secondary)" }}>Đang tải bài viết...</div>;
  }

  if (error) {
    return <div className="p-20 text-center" style={{ color: "var(--error)" }}>{error}</div>;
  }

  if (!article) {
    return <div className="p-20 text-center">Bài viết không tồn tại hoặc chưa được xuất bản</div>;
  }

  return (
    <div>
      <div className="aspect-[21/9] overflow-hidden">
        <ImageWithFallback src={productImg(article.image)} alt={article.title} className="w-full h-full object-cover" />
      </div>
      <article className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-xs ui-text mb-3" style={{ color: "var(--text-secondary)" }}>
          <Link to="/">Trang chủ</Link> &gt; <Link to="/news">Tin tức</Link> &gt; {article.title}
        </div>
        <div className="inline-block px-3 py-1 rounded-full text-xs ui-text mb-4" style={{ background: "var(--bg-section)", color: "var(--brand-brown)" }}>{article.category}</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>{article.title}</h1>
        <div className="flex items-center gap-4 mt-4 text-sm pb-6 border-b" style={{ color: "var(--text-secondary)", borderColor: "var(--border-line)" }}>
          {article.date && <span>{article.date}</span>}
          <span>Tác giả CoffeeGo</span>
          <span>{article.readTime} phút đọc</span>
        </div>
        <div className="prose mt-8 space-y-5" style={{ fontFamily: "var(--font-body)", fontSize: "1.1rem", lineHeight: 1.9, color: "var(--text-primary)" }}>
          {(article.body?.length ? article.body : [article.excerpt]).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        {related.length > 0 && (
          <div className="mt-16 pt-10 border-t" style={{ borderColor: "var(--border-line)" }}>
            <h2 className="mb-6" style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem" }}>Bài viết liên quan</h2>
            <div className="grid md:grid-cols-3 gap-5">
              {related.map((n) => (
                <Link key={n.slug} to={`/news/${n.slug}`} className="block rounded-xl overflow-hidden" style={{ background: "white", border: "1px solid var(--border-line)" }}>
                  <div className="aspect-video overflow-hidden">
                    <ImageWithFallback src={productImg(n.image)} alt={n.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <div className="text-xs" style={{ color: "var(--brand-hover)" }}>{n.category}</div>
                    <div className="font-semibold mt-1" style={{ fontFamily: "var(--font-display)" }}>{n.title}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
