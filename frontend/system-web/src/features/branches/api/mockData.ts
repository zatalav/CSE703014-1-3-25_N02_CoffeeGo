export interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  openTime: string;
  closeTime: string;
  manager: string | null;
  managerPhone?: string;
  status: "active" | "inactive";
  staffCount: number;
  monthlyRevenue: number;
  avgOrdersPerDay: number;
  description: string;
  district: string;
}

export interface WeeklySchedule {
  day: string;
  shortDay: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface StaffMember {
  id: number;
  name: string;
  role: string;
  phone: string;
  status: "active" | "inactive";
  joinDate: string;
  avatar: string;
}

export const mockBranches: Branch[] = [
  {
    id: 1,
    name: "Chi nhánh Quận 1",
    address: "123 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM",
    phone: "028 3822 1234",
    email: "q1@trasua.vn",
    openTime: "07:00",
    closeTime: "22:00",
    manager: "Nguyễn Thị Lan",
    managerPhone: "0901 234 567",
    status: "active",
    staffCount: 12,
    monthlyRevenue: 185000000,
    avgOrdersPerDay: 145,
    description: "Chi nhánh flagship tại trung tâm thành phố, khu vực đông dân cư và văn phòng.",
    district: "Quận 1",
  },
  {
    id: 2,
    name: "Chi nhánh Quận 3",
    address: "45 Võ Văn Tần, P. 6, Quận 3, TP.HCM",
    phone: "028 3930 5678",
    email: "q3@trasua.vn",
    openTime: "07:30",
    closeTime: "22:30",
    manager: "Trần Minh Tuấn",
    managerPhone: "0912 345 678",
    status: "active",
    staffCount: 10,
    monthlyRevenue: 142000000,
    avgOrdersPerDay: 118,
    description: "Chi nhánh khu vực quận 3, gần các trường đại học và khu ẩm thực.",
    district: "Quận 3",
  },
  {
    id: 3,
    name: "Chi nhánh Bình Thạnh",
    address: "78 Xô Viết Nghệ Tĩnh, P. 21, Bình Thạnh, TP.HCM",
    phone: "028 3511 2345",
    email: "binh-thanh@trasua.vn",
    openTime: "07:00",
    closeTime: "22:00",
    manager: null,
    status: "active",
    staffCount: 8,
    monthlyRevenue: 98000000,
    avgOrdersPerDay: 87,
    description: "Chi nhánh khu vực Bình Thạnh, phục vụ cộng đồng dân cư đông đúc.",
    district: "Bình Thạnh",
  },
  {
    id: 4,
    name: "Chi nhánh Thủ Đức",
    address: "156 Võ Văn Ngân, P. Bình Thọ, TP. Thủ Đức, TP.HCM",
    phone: "028 3722 6789",
    email: "thu-duc@trasua.vn",
    openTime: "08:00",
    closeTime: "22:00",
    manager: "Lê Thị Hoa",
    managerPhone: "0923 456 789",
    status: "active",
    staffCount: 9,
    monthlyRevenue: 112000000,
    avgOrdersPerDay: 95,
    description: "Chi nhánh khu vực Thủ Đức, gần đại học và khu công nghệ cao.",
    district: "Thủ Đức",
  },
  {
    id: 5,
    name: "Chi nhánh Gò Vấp",
    address: "234 Nguyễn Oanh, P. 17, Gò Vấp, TP.HCM",
    phone: "028 3894 3456",
    email: "go-vap@trasua.vn",
    openTime: "07:00",
    closeTime: "22:00",
    manager: "Phạm Văn Hùng",
    managerPhone: "0934 567 890",
    status: "inactive",
    staffCount: 7,
    monthlyRevenue: 0,
    avgOrdersPerDay: 0,
    description: "Chi nhánh Gò Vấp hiện đang tạm đóng cửa để sửa chữa và nâng cấp.",
    district: "Gò Vấp",
  },
  {
    id: 6,
    name: "Chi nhánh Tân Bình",
    address: "89 Cộng Hòa, P. 4, Tân Bình, TP.HCM",
    phone: "028 3849 7890",
    email: "tan-binh@trasua.vn",
    openTime: "07:00",
    closeTime: "23:00",
    manager: "Hoàng Thị Mai",
    managerPhone: "0945 678 901",
    status: "active",
    staffCount: 11,
    monthlyRevenue: 158000000,
    avgOrdersPerDay: 132,
    description: "Chi nhánh Tân Bình, gần sân bay Tân Sơn Nhất, đông khách du lịch và doanh nhân.",
    district: "Tân Bình",
  },
];

export const defaultSchedule: WeeklySchedule[] = [
  { day: "Thứ Hai", shortDay: "T2", isOpen: true, openTime: "07:00", closeTime: "22:00" },
  { day: "Thứ Ba", shortDay: "T3", isOpen: true, openTime: "07:00", closeTime: "22:00" },
  { day: "Thứ Tư", shortDay: "T4", isOpen: true, openTime: "07:00", closeTime: "22:00" },
  { day: "Thứ Năm", shortDay: "T5", isOpen: true, openTime: "07:00", closeTime: "22:00" },
  { day: "Thứ Sáu", shortDay: "T6", isOpen: true, openTime: "07:00", closeTime: "23:00" },
  { day: "Thứ Bảy", shortDay: "T7", isOpen: true, openTime: "07:00", closeTime: "23:00" },
  { day: "Chủ Nhật", shortDay: "CN", isOpen: true, openTime: "08:00", closeTime: "22:00" },
];

export const mockStaff: Record<number, StaffMember[]> = {
  1: [
    { id: 1, name: "Nguyễn Thị Lan", role: "Quản lý chi nhánh", phone: "0901 234 567", status: "active", joinDate: "01/03/2023", avatar: "NL" },
    { id: 2, name: "Trần Văn Bình", role: "Nhân viên pha chế", phone: "0912 111 222", status: "active", joinDate: "15/06/2023", avatar: "TB" },
    { id: 3, name: "Lê Thị Cẩm", role: "Nhân viên thu ngân", phone: "0923 222 333", status: "active", joinDate: "01/07/2023", avatar: "LC" },
    { id: 4, name: "Phạm Minh Dũng", role: "Nhân viên phục vụ", phone: "0934 333 444", status: "active", joinDate: "20/08/2023", avatar: "PD" },
    { id: 5, name: "Hoàng Thị Em", role: "Nhân viên pha chế", phone: "0945 444 555", status: "inactive", joinDate: "10/09/2023", avatar: "HE" },
  ],
  2: [
    { id: 6, name: "Trần Minh Tuấn", role: "Quản lý chi nhánh", phone: "0912 345 678", status: "active", joinDate: "01/01/2023", avatar: "TT" },
    { id: 7, name: "Nguyễn Văn Giang", role: "Nhân viên pha chế", phone: "0956 555 666", status: "active", joinDate: "01/04/2023", avatar: "NG" },
    { id: 8, name: "Lê Thị Hằng", role: "Nhân viên thu ngân", phone: "0967 666 777", status: "active", joinDate: "15/05/2023", avatar: "LH" },
  ],
};

export const revenueChartData = [
  { date: "15/04", revenue: 4200000 },
  { date: "16/04", revenue: 5800000 },
  { date: "17/04", revenue: 6100000 },
  { date: "18/04", revenue: 5300000 },
  { date: "19/04", revenue: 7200000 },
  { date: "20/04", revenue: 8500000 },
  { date: "21/04", revenue: 7900000 },
  { date: "22/04", revenue: 6100000 },
  { date: "23/04", revenue: 5800000 },
  { date: "24/04", revenue: 6300000 },
  { date: "25/04", revenue: 5900000 },
  { date: "26/04", revenue: 7100000 },
  { date: "27/04", revenue: 8200000 },
  { date: "28/04", revenue: 7600000 },
];

export const orderChartData = [
  { date: "15/04", orders: 98 },
  { date: "16/04", orders: 125 },
  { date: "17/04", orders: 132 },
  { date: "18/04", orders: 118 },
  { date: "19/04", orders: 155 },
  { date: "20/04", orders: 178 },
  { date: "21/04", orders: 165 },
  { date: "22/04", orders: 130 },
  { date: "23/04", orders: 128 },
  { date: "24/04", orders: 140 },
  { date: "25/04", orders: 122 },
  { date: "26/04", orders: 158 },
  { date: "27/04", orders: 175 },
  { date: "28/04", orders: 162 },
];
