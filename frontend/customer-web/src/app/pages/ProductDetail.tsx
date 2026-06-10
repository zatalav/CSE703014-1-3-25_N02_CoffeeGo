import { Link, useNavigate, useParams } from "react-router";
import { ProductModal } from "../components/ProductModal";
import { useCustomerMenu } from "../customerMenu";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, loading, error } = useCustomerMenu();
  const product = products.find((item) => item.id === id || String(item.productId) === id);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center" style={{ color: "var(--text-secondary)" }}>
        Đang tải sản phẩm...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem" }}>Không tìm thấy sản phẩm</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>{error || "Sản phẩm không tồn tại hoặc đã ngừng bán."}</p>
        <Link
          to="/products"
          className="mt-6 inline-flex rounded-xl px-5 py-2.5 font-semibold ui-text"
          style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}
        >
          Về danh sách sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh]">
      <ProductModal product={product} menuProducts={products} onClose={() => navigate("/products")} />
    </div>
  );
}
