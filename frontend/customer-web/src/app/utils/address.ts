export type WardOption = {
  code: number;
  name: string;
};

export type DistrictOption = {
  code: number;
  name: string;
  wards?: WardOption[];
};

export type ProvinceOption = {
  code: number;
  name: string;
  districts?: DistrictOption[];
};

export type GeoPoint = {
  lat: number;
  lng: number;
};

const VIETNAM_ADDRESS_API = "https://provinces.open-api.vn/api/?depth=3";
const NOMINATIM_SEARCH_API = "https://nominatim.openstreetmap.org/search";

let addressBookPromise: Promise<ProvinceOption[]> | null = null;

export function getVietnamAddressBook() {
  if (!addressBookPromise) {
    addressBookPromise = fetch(VIETNAM_ADDRESS_API)
      .then((response) => {
        if (!response.ok) throw new Error("Không tải được API địa chỉ Việt Nam.");
        return response.json() as Promise<ProvinceOption[]>;
      });
  }
  return addressBookPromise;
}

export function composeAddress(parts: {
  detail?: string;
  ward?: string;
  district?: string;
  province?: string;
}) {
  return [parts.detail, parts.ward, parts.district, parts.province]
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(", ");
}

export async function geocodeVietnamAddress(address: string): Promise<GeoPoint | null> {
  const query = address.trim();
  if (!query) return null;

  const url = new URL(NOMINATIM_SEARCH_API);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "vn");
  url.searchParams.set("q", query);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error("Không định vị được địa chỉ giao hàng.");
  const data = await response.json() as { lat?: string; lon?: string }[];
  const first = data[0];
  const lat = Number(first?.lat);
  const lng = Number(first?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function haversineKm(from: GeoPoint, to: GeoPoint) {
  const earthRadiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
