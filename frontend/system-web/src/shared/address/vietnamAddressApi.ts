export type VietnamWard = {
  code: number;
  name: string;
  district_code?: number;
};

export type VietnamDistrict = {
  code: number;
  name: string;
  province_code?: number;
  wards?: VietnamWard[];
};

export type VietnamProvince = {
  code: number;
  name: string;
  districts?: VietnamDistrict[];
};

const BASE_URL = "https://provinces.open-api.vn/api/v1";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) throw new Error("Không tải được dữ liệu tỉnh thành.");
  return response.json() as Promise<T>;
}

export function fetchProvinces() {
  return getJson<VietnamProvince[]>("/p/");
}

export function fetchProvince(code: number) {
  return getJson<VietnamProvince>(`/p/${code}?depth=2`);
}

export function fetchDistrict(code: number) {
  return getJson<VietnamDistrict>(`/d/${code}?depth=2`);
}
