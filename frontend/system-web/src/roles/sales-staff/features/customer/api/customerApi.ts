import { employeeApi } from "../../../shared/api/client";
import { Customer } from "../types";

interface CustomerLookupDto {
  id: number;
  name?: string;
  phone?: string;
  email?: string;
  points?: number;
  rank?: string;
  totalOrders?: number;
  lastOrder?: string;
}

export async function searchCustomers(keyword: string): Promise<Customer[]> {
  const q = encodeURIComponent(keyword.trim());
  if (!q) return [];
  const rows = await employeeApi.get<CustomerLookupDto[]>(`/customers/search?keyword=${q}&size=20`);
  return rows.map(row => ({
    id: String(row.id),
    name: row.name || `Khach hang #${row.id}`,
    phone: row.phone || "",
    email: row.email || "",
    points: Number(row.points ?? 0),
    rank: row.rank || "",
    totalOrders: Number(row.totalOrders ?? 0),
    lastOrder: row.lastOrder || "",
  }));
}
