import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapPoint } from "./osm";

export type LeafletMarker = MapPoint & {
  id: string | number;
  title: string;
  description?: string;
  active?: boolean;
  onClick?: () => void;
};

type Props = {
  markers: LeafletMarker[];
  center: MapPoint;
  zoom?: number;
  className?: string;
  style?: CSSProperties;
  fitBounds?: boolean;
  locateSignal?: number;
};

export function LeafletMap({ markers, center, zoom = 14, className, style, fitBounds = false, locateSignal = 0 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([center.lat, center.lng], zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      userLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const bounds = L.latLngBounds([]);
    markers.forEach((marker) => {
      const leafletMarker = L.marker([marker.lat, marker.lng], { icon: pinIcon(marker.active) })
        .bindPopup(popupHtml(marker.title, marker.description));
      leafletMarker.on("click", () => marker.onClick?.());
      leafletMarker.addTo(layer);
      bounds.extend([marker.lat, marker.lng]);
    });

    const activeMarker = markers.find((marker) => marker.active);
    if (activeMarker) {
      map.setView([activeMarker.lat, activeMarker.lng], Math.max(zoom, 15));
    } else if (markers.length > 1 && fitBounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: Math.max(zoom, 15) });
    } else if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], zoom);
    } else {
      map.setView([center.lat, center.lng], zoom);
    }
  }, [center.lat, center.lng, fitBounds, markers, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = userLayerRef.current;
    if (!map || !layer || locateSignal <= 0 || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((position) => {
      const point: [number, number] = [position.coords.latitude, position.coords.longitude];
      layer.clearLayers();
      L.circleMarker(point, {
        radius: 7,
        color: "#2563EB",
        weight: 3,
        fillColor: "#60A5FA",
        fillOpacity: 0.9,
      }).addTo(layer);
      map.setView(point, 15);
    });
  }, [locateSignal]);

  return <div ref={containerRef} className={className} style={style} />;
}

function pinIcon(active?: boolean) {
  const color = active ? "#2563EB" : "#DC2626";
  const size = active ? 48 : 42;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size - 5],
    popupAnchor: [0, -size + 8],
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:999px 999px 999px 0;
      background:${color};transform:rotate(-45deg);
      box-shadow:0 8px 18px rgba(15,23,42,.25);
      border:4px solid white;position:relative;">
        <div style="
          position:absolute;left:50%;top:50%;width:${Math.round(size * 0.36)}px;height:${Math.round(size * 0.36)}px;
          border-radius:999px;background:white;transform:translate(-50%,-50%);"></div>
      </div>
      <div style="
        width:10px;height:10px;border-radius:999px;background:rgba(15,23,42,.25);
        margin:${active ? -1 : -3}px auto 0;"></div>`,
  });
}

function popupHtml(title: string, description?: string) {
  const safeTitle = escapeHtml(title);
  const safeDescription = description ? escapeHtml(description) : "";
  return `<strong>${safeTitle}</strong>${safeDescription ? `<br/><span>${safeDescription}</span>` : ""}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
