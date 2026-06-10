import { Link } from "react-router";
import { Award, Coffee, Handshake, MapPinned, Sprout, Store } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

const storySections = [
  {
    title: "Khởi nguồn từ một góc phố",
    text: "CoffeeGo bắt đầu từ một quán nhỏ trên phố Hàng Bông, nơi nhóm sáng lập muốn giữ lại nhịp cà phê Việt trong một không gian hiện đại, gần gũi và đủ yên tĩnh cho những cuộc gặp mỗi ngày.",
    img: "photo-1453614512568-c4024d13c247",
    reverse: false,
  },
  {
    title: "Hành trình của hạt",
    text: "Nguồn hạt được chọn từ Buôn Ma Thuột, Đắk Lắk và Cầu Đất. Mỗi mẻ rang được kiểm soát theo hồ sơ hương vị riêng để giữ độ đậm, hậu vị sạch và mùi thơm quen thuộc của cà phê Việt.",
    img: "photo-1611854779393-1b2da9d400fe",
    reverse: true,
  },
  {
    title: "Pha chế tâm huyết",
    text: "Từ phin truyền thống đến espresso hiện đại, đội ngũ CoffeeGo dùng cùng một tiêu chuẩn: định lượng rõ, thao tác nhất quán, phục vụ nhanh nhưng không đánh mất hương vị.",
    img: "photo-1495474472287-4d71bcdd2085",
    reverse: false,
  },
];

const philosophy = [
  {
    icon: Sprout,
    title: "Nguyên liệu thuần Việt",
    description: "Hạt cà phê, trà, trái cây và bánh được ưu tiên từ nguồn cung trong nước có kiểm soát.",
  },
  {
    icon: Coffee,
    title: "Công thức ổn định",
    description: "Mỗi món có định lượng chuẩn để khách hàng nhận cùng một chất lượng ở mọi chi nhánh.",
  },
  {
    icon: Store,
    title: "Không gian thân quen",
    description: "Quán được thiết kế cho cả ghé nhanh, làm việc, hẹn gặp và những buổi cà phê chậm.",
  },
];

const baristas = [
  {
    name: "Nguyễn Minh",
    role: "Head Barista",
    branch: "CoffeeGo Hồ Tây",
    image: "photo-1522529599102-193c0d76b5b6",
    note: "Phụ trách chuẩn vị phin và đào tạo ca sáng.",
  },
  {
    name: "Trần Hà",
    role: "Roastmaster",
    branch: "Xưởng rang CoffeeGo",
    image: "photo-1556157382-97eda2d62296",
    note: "Theo dõi hồ sơ rang Arabica, Robusta và blend mùa vụ.",
  },
  {
    name: "Lê Quân",
    role: "Founder",
    branch: "CoffeeGo Phố Cổ",
    image: "photo-1506794778202-cad84cf45f1d",
    note: "Định hướng trải nghiệm quán và văn hóa phục vụ.",
  },
  {
    name: "Phạm Lan",
    role: "Pha chế trưởng",
    branch: "CoffeeGo Nguyễn Huệ",
    image: "photo-1544005313-94ddf0286df2",
    note: "Phát triển menu seasonal và kiểm soát chất lượng đồ uống.",
  },
];

const timeline = [
  { year: "2018", event: "Khai trương quán đầu tiên tại phố Hàng Bông, Hà Nội." },
  { year: "2020", event: "Mở rộng 5 chi nhánh, ra mắt dòng cà phê rang xay đóng gói." },
  { year: "2022", event: "Vào Sài Gòn với chi nhánh Nguyễn Huệ theo mô hình flagship." },
  { year: "2024", event: "Vượt mốc 15 chi nhánh và triển khai hệ thành viên DRIP." },
  { year: "2026", event: "Tổ chức CoffeeGo Festival với cộng đồng barista Việt." },
];

export default function About() {
  return (
    <div>
      <section className="relative flex min-h-[78vh] items-center justify-center overflow-hidden">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1611854779393-1b2da9d400fe?auto=format&fit=crop&w=2000&q=80"
          alt="Đồn điền cà phê"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.48 }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, var(--bg-primary) 0%, transparent 42%, var(--bg-primary) 100%)" }} />
        <div className="relative max-w-3xl px-6 text-center">
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.7rem, 7vw, 6rem)", lineHeight: 1.05 }}>
            Câu chuyện
            <br />
            <em style={{ color: "var(--brand-brown)" }}>CoffeeGo</em>
          </h1>
          <p className="mt-6 text-lg italic" style={{ color: "var(--text-secondary)" }}>
            Từ hạt cà phê Tây Nguyên đến ly phin buổi sáng của bạn.
          </p>
        </div>
      </section>

      {storySections.map((section) => (
        <section key={section.title} className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 md:grid-cols-2">
          <div className={section.reverse ? "md:order-2" : ""}>
            <div className="aspect-[4/5] overflow-hidden rounded-[1.5rem]" style={{ border: "1px solid var(--border-line)" }}>
              <ImageWithFallback
                src={`https://images.unsplash.com/${section.img}?auto=format&fit=crop&w=1000&q=80`}
                alt={section.title}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div className={section.reverse ? "md:order-1" : ""}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3rem)" }}>{section.title}</h2>
            <p className="mt-4 text-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>{section.text}</p>
          </div>
        </section>
      ))}

      <section className="px-6 py-20" style={{ background: "var(--bg-section)" }}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3rem)" }}>
              Triết lý <em style={{ color: "var(--brand-brown)" }}>pha chế</em>
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {philosophy.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-2xl bg-white p-8 text-center" style={{ border: "1px solid var(--border-line)" }}>
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "var(--bg-card)", color: "var(--brand-brown)" }}>
                  <Icon size={28} />
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem" }}>{title}</h3>
                <p className="mt-3" style={{ color: "var(--text-secondary)" }}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3rem)" }}>
            Đội ngũ <em style={{ color: "var(--brand-brown)" }}>Barista</em>
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {baristas.map((person) => (
            <article key={person.name} className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid var(--border-line)" }}>
              <div className="aspect-[4/5] overflow-hidden">
                <ImageWithFallback
                  src={`https://images.unsplash.com/${person.image}?auto=format&fit=crop&w=700&q=80`}
                  alt={person.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-5">
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem" }}>{person.name}</h3>
                <div className="mt-1 text-sm ui-text" style={{ color: "var(--brand-brown)" }}>{person.role}</div>
                <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <MapPinned size={15} />
                  {person.branch}
                </div>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{person.note}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-12 text-center">
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3rem)" }}>
            Hành trình <em style={{ color: "var(--brand-brown)" }}>CoffeeGo</em>
          </h2>
        </div>
        <div className="relative space-y-8 border-l-2 pl-10" style={{ borderColor: "var(--border-line)" }}>
          {timeline.map((item) => (
            <div key={item.year} className="relative">
              <div className="absolute -left-[2.85rem] top-1 h-5 w-5 rounded-full" style={{ background: "var(--brand-brown)" }} />
              <div className="font-bold" style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--brand-brown)" }}>{item.year}</div>
              <p style={{ color: "var(--text-secondary)" }}>{item.event}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 text-center" style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}>
        <Award className="mx-auto mb-4" size={34} />
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3rem)", color: "white" }}>Đến với CoffeeGo</h2>
        <p className="mx-auto mt-3 max-w-xl opacity-90">Một ly cà phê, một khoảnh khắc Việt. Hẹn gặp bạn ở chi nhánh gần nhất.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/stores" className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 font-semibold ui-text" style={{ background: "white", color: "var(--brand-brown)" }}>
            <Store size={18} />
            Tìm quán gần nhất
          </Link>
          <Link to="/rewards" className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 font-semibold ui-text" style={{ border: "1px solid rgba(255,255,255,0.45)", color: "white" }}>
            <Handshake size={18} />
            Tham gia DRIP
          </Link>
        </div>
      </section>
    </div>
  );
}
