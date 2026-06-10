export const revenueFallback = {
  kpis: [
    { label: "Tổng doanh thu", value: "186.4M đ", change: "+12%", positive: true },
    { label: "DT trung bình/ngày", value: "6.2M đ", change: "+8%", positive: true },
    { label: "Số đơn hàng", value: "1,284", change: "+9%", positive: true },
    { label: "Giá trị đơn TB", value: "145K đ", change: "+3%", positive: true },
  ],
  dailyRevenue: [
    { date: "26/5", revenue: 5200000, prev: 4600000 },
    { date: "27/5", revenue: 6100000, prev: 5100000 },
    { date: "28/5", revenue: 5800000, prev: 5400000 },
    { date: "29/5", revenue: 6900000, prev: 5700000 },
    { date: "30/5", revenue: 7400000, prev: 6200000 },
    { date: "31/5", revenue: 8300000, prev: 6900000 },
    { date: "1/6", revenue: 7800000, prev: 6500000 },
  ],
  branchRevenue: [
    { branch: "Quận 1", revenue: 62000000 },
    { branch: "Quận 3", revenue: 44000000 },
    { branch: "Bình Thạnh", revenue: 35000000 },
    { branch: "Thủ Đức", revenue: 28000000 },
    { branch: "Tân Bình", revenue: 17400000 },
  ],
  channelData: [
    { name: "Tại quầy", value: 46, color: "#0F4761" },
    { name: "Giao hàng", value: 34, color: "#10B981" },
    { name: "Mang đi", value: 20, color: "#F59E0B" },
  ],
  hourRevenue: [
    { hour: "07h", revenue: 1800000 },
    { hour: "09h", revenue: 4200000 },
    { hour: "11h", revenue: 6800000 },
    { hour: "13h", revenue: 5200000 },
    { hour: "15h", revenue: 4500000 },
    { hour: "17h", revenue: 6100000 },
    { hour: "19h", revenue: 3900000 },
  ],
  topProducts: [
    { name: "Cold Brew Cam Sả", revenue: 18400000, qty: 286 },
    { name: "Latte Đá", revenue: 16300000, qty: 312 },
    { name: "Trà Đào Cam Sả", revenue: 14200000, qty: 274 },
    { name: "Bạc Xỉu", revenue: 11800000, qty: 260 },
    { name: "Matcha Latte", revenue: 9700000, qty: 188 },
  ],
};

export const inventoryFallback = {
  kpis: [
    { label: "Tổng giá trị nhập kho", value: "92.5M đ", color: "text-green-600", bg: "bg-green-50" },
    { label: "Tổng giá trị xuất kho", value: "74.2M đ", color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Giá trị tồn kho", value: "138.8M đ", color: "text-blue-600", bg: "bg-blue-50" },
    { label: "NL dưới mức tối thiểu", value: "4", color: "text-red-600", bg: "bg-red-50" },
  ],
  weeklyData: [
    { week: "6/5", import: 18000000, export: 12400000 },
    { week: "13/5", import: 22400000, export: 17100000 },
    { week: "20/5", import: 19600000, export: 18500000 },
    { week: "27/5", import: 32500000, export: 26200000 },
  ],
  ingredientTable: [
    { name: "Sữa tươi", unit: "lít", open: 80, import_: 120, export_: 146, close: 54, min: 70 },
    { name: "Hạt arabica", unit: "kg", open: 48, import_: 60, export_: 42, close: 66, min: 45 },
    { name: "Syrup caramel", unit: "chai", open: 28, import_: 20, export_: 31, close: 17, min: 24 },
    { name: "Ly giấy size M", unit: "cái", open: 1200, import_: 2000, export_: 2450, close: 750, min: 900 },
  ],
  alerts: [
    { name: "Sữa tươi", current: 54, min: 70, unit: "lít", suggested: 86 },
    { name: "Syrup caramel", current: 17, min: 24, unit: "chai", suggested: 31 },
    { name: "Ly giấy size M", current: 750, min: 900, unit: "cái", suggested: 1050 },
  ],
};

export const orderFallback = {
  kpis: [
    { label: "Tổng đơn hàng", value: "1,284", change: "+9%", positive: true },
    { label: "Đơn hoàn thành", value: "1,126", change: "+11%", positive: true },
    { label: "Đơn hủy", value: "28", change: "-6%", positive: true },
    { label: "Giá trị TB / đơn", value: "145K đ", change: "+3%", positive: true },
  ],
  dailyOrders: [
    { day: "26/5", orders: 142, revenue: 18 },
    { day: "27/5", orders: 156, revenue: 21 },
    { day: "28/5", orders: 148, revenue: 20 },
    { day: "29/5", orders: 176, revenue: 24 },
    { day: "30/5", orders: 193, revenue: 28 },
    { day: "31/5", orders: 226, revenue: 33 },
    { day: "1/6", orders: 205, revenue: 30 },
  ],
  channelData: [
    { name: "Tại quầy", value: 48, color: "#0F4761" },
    { name: "Giao hàng", value: 32, color: "#10B981" },
    { name: "Mang đi", value: 20, color: "#F59E0B" },
  ],
  statusData: [
    { name: "Hoàn thành", value: 1126, color: "#10B981" },
    { name: "Đang pha chế", value: 74, color: "#3B82F6" },
    { name: "Chờ xác nhận", value: 56, color: "#F59E0B" },
    { name: "Đã hủy", value: 28, color: "#EF4444" },
  ],
  hourlyData: [
    { hour: "07h", orders: 52 },
    { hour: "09h", orders: 136 },
    { hour: "11h", orders: 184 },
    { hour: "13h", orders: 142 },
    { hour: "15h", orders: 126 },
    { hour: "17h", orders: 172 },
    { hour: "19h", orders: 98 },
  ],
  topItems: [
    { name: "Cold Brew Cam Sả", orders: 286, revenue: "18.4M đ", growth: "+18%" },
    { name: "Latte Đá", orders: 312, revenue: "16.3M đ", growth: "+9%" },
    { name: "Trà Đào Cam Sả", orders: 274, revenue: "14.2M đ", growth: "+12%" },
  ],
  branchData: [
    { branch: "Quận 1", orders: 384, aov: 162000 },
    { branch: "Quận 3", orders: 296, aov: 149000 },
    { branch: "Bình Thạnh", orders: 224, aov: 143000 },
    { branch: "Thủ Đức", orders: 198, aov: 137000 },
  ],
};

export const customerFallback = {
  kpis: [
    { label: "Tổng khách hàng", value: "8,420", change: "+5%" },
    { label: "Khách mới trong kỳ", value: "364", change: "+11%" },
    { label: "Khách quay lại", value: "1,284", change: "+8%" },
    { label: "Tỷ lệ giữ chân", value: "68%", change: "+4%" },
  ],
  growthData: [
    { month: "1/2026", customers: 620 },
    { month: "2/2026", customers: 710 },
    { month: "3/2026", customers: 840 },
    { month: "4/2026", customers: 930 },
    { month: "5/2026", customers: 1040 },
    { month: "6/2026", customers: 1120 },
  ],
  tierData: [
    { name: "Đồng", value: 42, color: "#D97706" },
    { name: "Bạc", value: 28, color: "#6B7280" },
    { name: "Vàng", value: 20, color: "#F59E0B" },
    { name: "Kim cương", value: 10, color: "#3B82F6" },
  ],
  frequencyData: [
    { group: "Khách mới", freq: 1.2, value: 2100, fill: "#10B981" },
    { group: "Mua thưa", freq: 2.4, value: 3120, fill: "#F59E0B" },
    { group: "Thường xuyên", freq: 5.8, value: 2480, fill: "#0F4761" },
    { group: "VIP", freq: 11.2, value: 720, fill: "#8B5CF6" },
  ],
  vipCustomers: [
    { name: "Nguyễn Minh Anh", tier: "Kim cương", points: 12400, spend: "18.2M đ", orders: 86 },
    { name: "Trần Hoàng Nam", tier: "Vàng", points: 9200, spend: "13.4M đ", orders: 64 },
    { name: "Lê Thu Hà", tier: "Vàng", points: 8100, spend: "11.9M đ", orders: 58 },
  ],
  pointStats: [
    { label: "Tổng điểm đã phát", value: "2,450,000 điểm", color: "text-blue-600" },
    { label: "Tổng điểm đã đổi", value: "1,180,000 điểm", color: "text-green-600" },
    { label: "Đang lưu hành", value: "1,270,000 điểm", color: "text-orange-600" },
  ],
};
