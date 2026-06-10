export type MapPoint = {
  lat: number;
  lng: number;
};

export const DEFAULT_OSM_POINT: MapPoint = { lat: 21.0278, lng: 105.8342 };

const geocodeCache = new Map<string, MapPoint>();

export function openStreetMapMarkerUrl(point: MapPoint, zoom = 17) {
  return `https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=${zoom}/${point.lat}/${point.lng}`;
}

export function openStreetMapSearchUrl(query: string) {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
}

export async function geocodeAddress(address: string, fallback: MapPoint = DEFAULT_OSM_POINT) {
  const query = address.trim();
  if (!query) return fallback;
  const cached = geocodeCache.get(query);
  if (cached) return cached;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("accept-language", "vi");
  url.searchParams.set("q", query);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) return fallback;
    const data = await response.json();
    const first = Array.isArray(data) ? data[0] : null;
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const point = { lat, lng };
      geocodeCache.set(query, point);
      return point;
    }
  } catch {
    return fallback;
  }
  return fallback;
}
