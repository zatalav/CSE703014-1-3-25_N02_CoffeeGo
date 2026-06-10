import { useEffect, useState } from "react";
import { apiRequest, pageItems, type PageResponse } from "./api";
import { stores as fallbackStores } from "./data";

export type StoreLocation = {
  id: number;
  name: string;
  address: string;
  phone: string;
  hours: string;
  open: boolean;
  lat: number;
  lng: number;
};

type BranchDto = {
  branchId?: number | null;
  branchName?: string | null;
  address?: string | null;
  phone?: string | null;
  branchType?: string | null;
  status?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type BranchHoursDto = {
  dayOfWeek?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  isClosed?: boolean | null;
};

const fallbackById = new Map(fallbackStores.map((store) => [store.id, store]));

function activeStatus(status?: string | null) {
  const normalized = (status || "").trim().toLowerCase();
  return !normalized || normalized === "active";
}

function salesBranch(branchType?: string | null) {
  const normalized = (branchType || "").trim().toLowerCase();
  return normalized !== "warehouse";
}

function time(value?: string | null) {
  return value ? value.slice(0, 5) : "";
}

function deriveHours(hours: BranchHoursDto[]) {
  const firstOpen = hours.find((item) => !item.isClosed && item.openTime && item.closeTime);
  const open = time(firstOpen?.openTime);
  const close = time(firstOpen?.closeTime);
  return open && close ? `${open} - ${close}` : "07:00 - 22:00";
}

function fallbackCoordinate(branchId: number, index: number) {
  const fallback = fallbackById.get(branchId) || fallbackStores[index % fallbackStores.length];
  return {
    lat: fallback?.lat ?? 10.7769,
    lng: fallback?.lng ?? 106.7009,
  };
}

function toStore(branch: BranchDto, hours: BranchHoursDto[], index: number): StoreLocation | null {
  const id = Number(branch.branchId || 0);
  if (!id || !salesBranch(branch.branchType)) return null;

  const fallback = fallbackCoordinate(id, index);
  const lat = Number(branch.latitude);
  const lng = Number(branch.longitude);

  return {
    id,
    name: branch.branchName?.trim() || `CoffeeGo #${id}`,
    address: branch.address?.trim() || "Chưa cập nhật địa chỉ",
    phone: branch.phone?.trim() || "",
    hours: deriveHours(hours),
    open: activeStatus(branch.status),
    lat: Number.isFinite(lat) ? lat : fallback.lat,
    lng: Number.isFinite(lng) ? lng : fallback.lng,
  };
}

export async function fetchPublicStores(): Promise<StoreLocation[]> {
  const payload = await apiRequest<PageResponse<BranchDto> | BranchDto[]>("/branches?size=500&sort=branchId,asc");
  const branches = pageItems(payload).filter((branch) => salesBranch(branch.branchType));
  const stores = await Promise.all(branches.map(async (branch, index) => {
    const id = Number(branch.branchId || 0);
    const hours = id
      ? await apiRequest<BranchHoursDto[]>(`/branches/${id}/hours`).catch(() => [])
      : [];
    return toStore(branch, hours, index);
  }));
  return stores.filter((store): store is StoreLocation => Boolean(store));
}

export function usePublicStores() {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPublicStores();
        if (!active) return;
        setStores(data);
      } catch (err) {
        if (!active) return;
        setStores(fallbackStores);
        setError(err instanceof Error ? err.message : "Không tải được danh sách chi nhánh.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return { stores, loading, error };
}
