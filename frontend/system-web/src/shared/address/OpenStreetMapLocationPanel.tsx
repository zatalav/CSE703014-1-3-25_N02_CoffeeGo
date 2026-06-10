import { useEffect, useMemo, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { LeafletMap } from "../map/LeafletMap";
import { DEFAULT_OSM_POINT, geocodeAddress, openStreetMapMarkerUrl, openStreetMapSearchUrl } from "../map/osm";

type Props = {
  address: string;
  title?: string;
  latitude?: number | null;
  longitude?: number | null;
  mapUrl?: string | null;
};

export function OpenStreetMapLocationPanel({ address, title = "Bản đồ OpenStreetMap", latitude, longitude, mapUrl }: Props) {
  const hasCoordinates = typeof latitude === "number"
    && typeof longitude === "number"
    && Number.isFinite(latitude)
    && Number.isFinite(longitude);
  const parsedCoordinates = useMemo(() => parseCoordinateText(coordinatesFromMapUrl(mapUrl)), [mapUrl]);
  const [geocodedPoint, setGeocodedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const queryText = address.trim() || "CoffeeGo Vietnam";
  const point = hasCoordinates
    ? { lat: latitude, lng: longitude }
    : parsedCoordinates || geocodedPoint || DEFAULT_OSM_POINT;
  const hasMapPoint = hasCoordinates || Boolean(parsedCoordinates) || Boolean(geocodedPoint);
  const mapsUrl = hasMapPoint
    ? openStreetMapMarkerUrl(point)
    : openStreetMapSearchUrl(queryText);
  const markers = hasMapPoint
    ? [{ id: "location", lat: point.lat, lng: point.lng, title, description: address, active: true }]
    : [];

  useEffect(() => {
    if (hasCoordinates || parsedCoordinates || !address.trim()) {
      setGeocodedPoint(null);
      return;
    }
    let cancelled = false;
    void geocodeAddress(address, DEFAULT_OSM_POINT).then((nextPoint) => {
      if (!cancelled) setGeocodedPoint(nextPoint);
    });
    return () => {
      cancelled = true;
    };
  }, [address, hasCoordinates, parsedCoordinates]);

  return (
    <div className="overflow-hidden border border-gray-100 bg-white rounded-2xl shadow-sm">
      <div className="px-4 py-3 bg-blue-50 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[#0F4761]" style={{ fontSize:"13px", fontWeight:700 }}>
            <MapPin size={14}/> {title}
          </p>
          <p className="truncate text-gray-500" style={{ fontSize:"12px" }}>{address || "Chưa có địa chỉ"}</p>
        </div>
        <a href={mapsUrl} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0F4761] text-white rounded-full"
          style={{ fontSize:"12px", fontWeight:700 }}>
          <ExternalLink size={13}/> Mở OSM
        </a>
      </div>
      <LeafletMap
        markers={markers}
        center={point}
        zoom={markers.length ? 16 : 13}
        className="block w-full"
        style={{ height: 230 }}
      />
    </div>
  );
}

function coordinatesFromMapUrl(mapUrl?: string | null) {
  const value = mapUrl?.trim();
  if (!value) return "";
  const atMatch = value.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) return `${atMatch[1]},${atMatch[2]}`;
  const markerMatch = value.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (markerMatch) return `${markerMatch[1]},${markerMatch[2]}`;
  return "";
}

function parseCoordinateText(value: string) {
  const [latText, lngText] = value.split(",");
  const lat = Number(latText);
  const lng = Number(lngText);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}
