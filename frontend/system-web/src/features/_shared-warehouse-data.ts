export interface Ingredient {
  id: number;
  name: string;
  category: string;
  unit: string;
  current: number;
  minLevel: number;
  price: number;
  supplier: string;
  location: string;
  expiry?: string;
}

export interface StockNote {
  id: string;
  type: "import" | "export";
  supplier?: string;
  branch: string;
  date: string;
  items: StockNoteItem[];
  total: number;
  status: "confirmed" | "draft" | "cancelled";
  note?: string;
  reason?: string;
  createdBy: string;
}

export interface StockNoteItem {
  ingredientId: number;
  name: string;
  unit: string;
  qty: number;
  price: number;
}

export interface WarehouseSlot {
  zone: string;
  shelf: number;
  slot: number;
  ingredientId?: number;
  qty?: number;
  importDate?: string;
  expiry?: string;
}

export const ZONES = ["A", "B", "C", "D"];
export const SHELF_COUNT = 3;
export const SLOT_COUNT = 5;

export const SUPPLIERS = ["Công ty Linh Phát", "Tân Thành Foods", "An Khang Trading", "Đại Dương Supply", "Nam Phương Co."];
export const BRANCHES = ["Chi nhánh Quận 1", "Chi nhánh Quận 3", "Chi nhánh Bình Thạnh", "Chi nhánh Thủ Đức", "Chi nhánh Tân Bình"];
export const CATEGORIES = ["Bột & Nguyên liệu khô", "Sữa & Kem", "Topping", "Trà & Nguyên liệu cơ bản", "Vật tư & Bao bì", "Khác"];

export const ingredients: Ingredient[] = [
  { id: 1, name: "Bột trà sữa Thái Xanh", category: "Bột & Nguyên liệu khô", unit: "kg", current: 0.8, minLevel: 2, price: 320000, supplier: "Công ty Linh Phát", location: "Khu A / Kệ 1 / Ô 1" },
  { id: 2, name: "Bột trà sữa Oolong", category: "Bột & Nguyên liệu khô", unit: "kg", current: 3.5, minLevel: 2, price: 280000, supplier: "Công ty Linh Phát", location: "Khu A / Kệ 1 / Ô 2" },
  { id: 3, name: "Bột matcha Nhật Bản", category: "Bột & Nguyên liệu khô", unit: "kg", current: 1.8, minLevel: 1, price: 850000, supplier: "Tân Thành Foods", location: "Khu A / Kệ 1 / Ô 3" },
  { id: 4, name: "Kem sữa tươi Ngôi Sao", category: "Sữa & Kem", unit: "lít", current: 1.2, minLevel: 3, price: 45000, supplier: "An Khang Trading", location: "Khu B / Kệ 1 / Ô 1" },
  { id: 5, name: "Sữa đặc Ông Thọ 380g", category: "Sữa & Kem", unit: "lon", current: 24, minLevel: 12, price: 28000, supplier: "An Khang Trading", location: "Khu B / Kệ 1 / Ô 2" },
  { id: 6, name: "Kem tươi Anchor", category: "Sữa & Kem", unit: "lít", current: 5.5, minLevel: 3, price: 120000, supplier: "An Khang Trading", location: "Khu B / Kệ 1 / Ô 3" },
  { id: 7, name: "Trân châu đen", category: "Topping", unit: "kg", current: 3.2, minLevel: 2, price: 85000, supplier: "Đại Dương Supply", location: "Khu C / Kệ 1 / Ô 1" },
  { id: 8, name: "Trân châu trắng", category: "Topping", unit: "kg", current: 2.4, minLevel: 2, price: 90000, supplier: "Đại Dương Supply", location: "Khu C / Kệ 1 / Ô 2" },
  { id: 9, name: "Thạch flan", category: "Topping", unit: "hộp", current: 15, minLevel: 10, price: 35000, supplier: "Đại Dương Supply", location: "Khu C / Kệ 1 / Ô 3", expiry: "20/06/2026" },
  { id: 10, name: "Trà Oolong Đài Loan", category: "Trà & Nguyên liệu cơ bản", unit: "kg", current: 2.1, minLevel: 1.5, price: 420000, supplier: "Tân Thành Foods", location: "Khu A / Kệ 2 / Ô 1" },
  { id: 11, name: "Trà hồng Assam", category: "Trà & Nguyên liệu cơ bản", unit: "kg", current: 1.6, minLevel: 1, price: 380000, supplier: "Tân Thành Foods", location: "Khu A / Kệ 2 / Ô 2" },
  { id: 12, name: "Đường phèn", category: "Bột & Nguyên liệu khô", unit: "kg", current: 0.5, minLevel: 1, price: 32000, supplier: "Nam Phương Co.", location: "Khu A / Kệ 2 / Ô 3" },
  { id: 13, name: "Cốc nhựa L (700ml)", category: "Vật tư & Bao bì", unit: "cái", current: 180, minLevel: 100, price: 1200, supplier: "Nam Phương Co.", location: "Khu D / Kệ 1 / Ô 1" },
  { id: 14, name: "Cốc nhựa M (500ml)", category: "Vật tư & Bao bì", unit: "cái", current: 85, minLevel: 100, price: 1000, supplier: "Nam Phương Co.", location: "Khu D / Kệ 1 / Ô 2" },
  { id: 15, name: "Ống hút boba", category: "Vật tư & Bao bì", unit: "cái", current: 320, minLevel: 150, price: 500, supplier: "Nam Phương Co.", location: "Khu D / Kệ 1 / Ô 3" },
];

export const stockNotes: StockNote[] = [
  {
    id: "PN2026001",
    type: "import",
    supplier: "Công ty Linh Phát",
    branch: "Kho trung tâm",
    date: "14/05/2026",
    items: [
      { ingredientId: 1, name: "Bột trà sữa Thái Xanh", unit: "kg", qty: 10, price: 320000 },
      { ingredientId: 2, name: "Bột trà sữa Oolong", unit: "kg", qty: 8, price: 280000 },
    ],
    total: 5440000,
    status: "confirmed",
    note: "Nhập định kỳ tháng 5",
    createdBy: "NV-21",
  },
  {
    id: "PX2026015",
    type: "export",
    branch: "Chi nhánh Quận 1",
    date: "14/05/2026",
    items: [
      { ingredientId: 1, name: "Bột trà sữa Thái Xanh", unit: "kg", qty: 2, price: 320000 },
      { ingredientId: 4, name: "Kem sữa tươi Ngôi Sao", unit: "lít", qty: 5, price: 45000 },
    ],
    total: 865000,
    status: "confirmed",
    reason: "Cung ứng thường kỳ",
    createdBy: "NV-21",
  },
  {
    id: "PN2026000",
    type: "import",
    supplier: "Đại Dương Supply",
    branch: "Kho trung tâm",
    date: "13/05/2026",
    items: [
      { ingredientId: 7, name: "Trân châu đen", unit: "kg", qty: 5, price: 85000 },
      { ingredientId: 8, name: "Trân châu trắng", unit: "kg", qty: 5, price: 90000 },
      { ingredientId: 9, name: "Thạch flan", unit: "hộp", qty: 20, price: 35000 },
    ],
    total: 1475000,
    status: "confirmed",
    createdBy: "NV-22",
  },
  {
    id: "PX2026014",
    type: "export",
    branch: "Chi nhánh Quận 3",
    date: "13/05/2026",
    items: [
      { ingredientId: 7, name: "Trân châu đen", unit: "kg", qty: 1.5, price: 85000 },
      { ingredientId: 10, name: "Trà Oolong Đài Loan", unit: "kg", qty: 1, price: 420000 },
    ],
    total: 547500,
    status: "confirmed",
    reason: "Cung ứng tuần",
    createdBy: "NV-21",
  },
  {
    id: "PN2025098",
    type: "import",
    supplier: "An Khang Trading",
    branch: "Kho trung tâm",
    date: "10/05/2026",
    items: [
      { ingredientId: 4, name: "Kem sữa tươi Ngôi Sao", unit: "lít", qty: 20, price: 45000 },
      { ingredientId: 5, name: "Sữa đặc Ông Thọ 380g", unit: "lon", qty: 48, price: 28000 },
    ],
    total: 2244000,
    status: "confirmed",
    createdBy: "NV-22",
  },
];

export const warehouseMap: WarehouseSlot[] = [
  { zone: "A", shelf: 1, slot: 1, ingredientId: 1, qty: 0.8, importDate: "14/05/2026" },
  { zone: "A", shelf: 1, slot: 2, ingredientId: 2, qty: 3.5, importDate: "12/05/2026" },
  { zone: "A", shelf: 1, slot: 3, ingredientId: 3, qty: 1.8, importDate: "10/05/2026" },
  { zone: "A", shelf: 1, slot: 4 },
  { zone: "A", shelf: 1, slot: 5 },
  { zone: "A", shelf: 2, slot: 1, ingredientId: 10, qty: 2.1, importDate: "11/05/2026" },
  { zone: "A", shelf: 2, slot: 2, ingredientId: 11, qty: 1.6, importDate: "09/05/2026" },
  { zone: "A", shelf: 2, slot: 3, ingredientId: 12, qty: 0.5, importDate: "08/05/2026" },
  { zone: "A", shelf: 2, slot: 4 },
  { zone: "A", shelf: 2, slot: 5 },
  { zone: "A", shelf: 3, slot: 1 },
  { zone: "A", shelf: 3, slot: 2 },
  { zone: "A", shelf: 3, slot: 3 },
  { zone: "A", shelf: 3, slot: 4 },
  { zone: "A", shelf: 3, slot: 5 },
  { zone: "B", shelf: 1, slot: 1, ingredientId: 4, qty: 1.2, importDate: "14/05/2026", expiry: "20/05/2026" },
  { zone: "B", shelf: 1, slot: 2, ingredientId: 5, qty: 24, importDate: "10/05/2026", expiry: "01/07/2026" },
  { zone: "B", shelf: 1, slot: 3, ingredientId: 6, qty: 5.5, importDate: "12/05/2026", expiry: "25/05/2026" },
  { zone: "B", shelf: 1, slot: 4 },
  { zone: "B", shelf: 1, slot: 5 },
  { zone: "B", shelf: 2, slot: 1 },
  { zone: "B", shelf: 2, slot: 2 },
  { zone: "B", shelf: 2, slot: 3 },
  { zone: "B", shelf: 2, slot: 4 },
  { zone: "B", shelf: 2, slot: 5 },
  { zone: "B", shelf: 3, slot: 1 },
  { zone: "B", shelf: 3, slot: 2 },
  { zone: "B", shelf: 3, slot: 3 },
  { zone: "B", shelf: 3, slot: 4 },
  { zone: "B", shelf: 3, slot: 5 },
  { zone: "C", shelf: 1, slot: 1, ingredientId: 7, qty: 3.2, importDate: "13/05/2026" },
  { zone: "C", shelf: 1, slot: 2, ingredientId: 8, qty: 2.4, importDate: "13/05/2026" },
  { zone: "C", shelf: 1, slot: 3, ingredientId: 9, qty: 15, importDate: "13/05/2026", expiry: "20/06/2026" },
  { zone: "C", shelf: 1, slot: 4 },
  { zone: "C", shelf: 1, slot: 5 },
  { zone: "C", shelf: 2, slot: 1 },
  { zone: "C", shelf: 2, slot: 2 },
  { zone: "C", shelf: 2, slot: 3 },
  { zone: "C", shelf: 2, slot: 4 },
  { zone: "C", shelf: 2, slot: 5 },
  { zone: "C", shelf: 3, slot: 1 },
  { zone: "C", shelf: 3, slot: 2 },
  { zone: "C", shelf: 3, slot: 3 },
  { zone: "C", shelf: 3, slot: 4 },
  { zone: "C", shelf: 3, slot: 5 },
  { zone: "D", shelf: 1, slot: 1, ingredientId: 13, qty: 180, importDate: "05/05/2026" },
  { zone: "D", shelf: 1, slot: 2, ingredientId: 14, qty: 85, importDate: "05/05/2026" },
  { zone: "D", shelf: 1, slot: 3, ingredientId: 15, qty: 320, importDate: "03/05/2026" },
  { zone: "D", shelf: 1, slot: 4 },
  { zone: "D", shelf: 1, slot: 5 },
  { zone: "D", shelf: 2, slot: 1 },
  { zone: "D", shelf: 2, slot: 2 },
  { zone: "D", shelf: 2, slot: 3 },
  { zone: "D", shelf: 2, slot: 4 },
  { zone: "D", shelf: 2, slot: 5 },
  { zone: "D", shelf: 3, slot: 1 },
  { zone: "D", shelf: 3, slot: 2 },
  { zone: "D", shelf: 3, slot: 3 },
  { zone: "D", shelf: 3, slot: 4 },
  { zone: "D", shelf: 3, slot: 5 },
];
