import { apiUrl } from "./api";

export const productImg = (source?: string) => {
  const image = (source || "").trim();
  if (!image) return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80";
  if (/^(https?:|data:|blob:)/i.test(image)) return image;
  if (image.startsWith("/customer-assets/") || image.startsWith("/assets/")) return image;
  if (image.startsWith("/")) return apiUrl(image);
  return `https://images.unsplash.com/${image}?auto=format&fit=crop&w=800&q=80`;
};

export const stores = [
  { id: 1, name: "CoffeeGo Hồ Tây", address: "234 Lạc Long Quân, Tây Hồ, Hà Nội", phone: "0987 654 321", hours: "6:30 - 22:30", open: true, lat: 21.05, lng: 105.81 },
  { id: 2, name: "CoffeeGo Phố Cổ", address: "12 Hàng Bông, Hoàn Kiếm, Hà Nội", phone: "0987 111 222", hours: "7:00 - 23:00", open: true, lat: 21.03, lng: 105.85 },
  { id: 3, name: "CoffeeGo Nguyễn Huệ", address: "88 Nguyễn Huệ, Quận 1, TP.HCM", phone: "0901 222 333", hours: "6:00 - 23:30", open: true, lat: 10.77, lng: 106.7 },
  { id: 4, name: "CoffeeGo Thảo Điền", address: "45 Xuân Thủy, Thảo Điền, TP.HCM", phone: "0901 444 555", hours: "7:00 - 22:00", open: false, lat: 10.81, lng: 106.74 },
  { id: 5, name: "CoffeeGo Đà Nẵng", address: "120 Bạch Đằng, Hải Châu, Đà Nẵng", phone: "0905 666 777", hours: "6:30 - 22:00", open: true, lat: 16.07, lng: 108.22 },
];

export const news = [
  { slug: "ca-phe-trung-ha-noi", title: "Cà phê trứng - Hương vị Hà Nội xưa", excerpt: "Câu chuyện về ly cà phê trứng huyền thoại của phố cổ Hà Nội từ những năm 1940.", date: "28/05/2026", category: "Văn hóa cà phê Việt", image: "photo-1517701604599-bb29b565090c", readTime: 5 },
  { slug: "khai-truong-thao-dien", title: "CoffeeGo Thảo Điền khai trương - Ưu đãi 50%", excerpt: "Chi nhánh thứ 16 chính thức mở cửa với chương trình ưu đãi đặc biệt cho 1.000 khách đầu tiên.", date: "25/05/2026", category: "Tin tức quán", image: "photo-1453614512568-c4024d13c247", readTime: 3 },
  { slug: "ca-phe-cau-dat", title: "Hành trình hạt Arabica Cầu Đất", excerpt: "Từ đồn điền 1.500m so với mực nước biển đến ly cà phê thơm trên bàn bạn.", date: "20/05/2026", category: "Văn hóa cà phê Việt", image: "photo-1611854779393-1b2da9d400fe", readTime: 7 },
  { slug: "khuyen-mai-thang-6", title: "Tháng 6 - Mua 1 tặng 1 mỗi sáng", excerpt: "Ưu đãi đặc biệt từ 7:00-9:00 mỗi ngày trong tháng 6.", date: "18/05/2026", category: "Khuyến mãi", image: "photo-1495474472287-4d71bcdd2085", readTime: 2 },
  { slug: "festival-ca-phe", title: "CoffeeGo Festival 2026 - Sài Gòn", excerpt: "Lễ hội cà phê 3 ngày với hơn 50 barista từ khắp Việt Nam.", date: "15/05/2026", category: "Sự kiện", image: "photo-1525480122447-64809d765a90", readTime: 4 },
  { slug: "pha-phin-dung-cach", title: "5 bí quyết pha phin chuẩn vị", excerpt: "Barista CoffeeGo chia sẻ cách pha phin để có ly cà phê hoàn hảo.", date: "10/05/2026", category: "Văn hóa cà phê Việt", image: "photo-1442975631115-c4f7b05b8a2c", readTime: 6 },
];
