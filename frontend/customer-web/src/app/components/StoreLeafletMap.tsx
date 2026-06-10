import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { StoreLocation } from "../storeLocations";

type Store = StoreLocation;
type ZoomCommand = { action: "in" | "out"; tick: number };

type Props = {
  stores: Store[];
  activeId: number;
  tileMode: "standard" | "humanitarian";
  locateSignal: number;
  zoomCommand: ZoomCommand | null;
  onSelect: (id: number) => void;
};

const tileUrls = {
  standard: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  humanitarian: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
};

const DEFAULT_CENTER: [number, number] = [16.0471, 108.2068];
const DEFAULT_STORE_ZOOM = 14;
const SINGLE_STORE_ZOOM = 15;

export function StoreLeafletMap({ stores, activeId, tileMode, locateSignal, zoomCommand, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const activeStore = stores.find((store) => store.id === activeId) || stores[0];
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(
      activeStore ? [activeStore.lat, activeStore.lng] : DEFAULT_CENTER,
      activeStore ? DEFAULT_STORE_ZOOM : 6,
    );

    tileLayerRef.current = L.tileLayer(tileUrls.standard, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markerLayerRef.current = null;
      userLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    stores.forEach((store) => {
      const active = store.id === activeId;
      const marker = L.marker([store.lat, store.lng], { icon: storePinIcon(active, store.open) })
        .bindPopup(`<strong>${escapeHtml(store.name)}</strong><br/><span>${escapeHtml(store.address)}</span>`);
      marker.on("click", () => onSelect(store.id));
      marker.addTo(layer);
    });

    const activeStore = stores.find((store) => store.id === activeId) || stores[0];
    if (activeStore) {
      map.setView(
        [activeStore.lat, activeStore.lng],
        stores.length === 1 ? SINGLE_STORE_ZOOM : DEFAULT_STORE_ZOOM,
        { animate: true },
      );
    }
  }, [activeId, onSelect, stores]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const activeStore = stores.find((store) => store.id === activeId);
    if (activeStore) {
      map.setView([activeStore.lat, activeStore.lng], Math.max(map.getZoom(), DEFAULT_STORE_ZOOM), { animate: true });
    }
  }, [activeId, stores]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = tileLayerRef.current;
    if (!map || !layer) return;
    layer.setUrl(tileUrls[tileMode]);
  }, [tileMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !zoomCommand) return;
    if (zoomCommand.action === "in") map.zoomIn();
    if (zoomCommand.action === "out") map.zoomOut();
  }, [zoomCommand]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = userLayerRef.current;
    if (!map || !layer || locateSignal <= 0 || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((position) => {
      const point: [number, number] = [position.coords.latitude, position.coords.longitude];
      layer.clearLayers();
      L.circleMarker(point, {
        radius: 8,
        color: "#5C3317",
        weight: 3,
        fillColor: "#8B4513",
        fillOpacity: 0.95,
      }).addTo(layer);
      map.setView(point, 15);
    });
  }, [locateSignal]);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
}

function storePinIcon(active: boolean, open: boolean) {
  const color = active ? "#5C3317" : open ? "#4A7C45" : "#7A5C42";
  const size = active ? 50 : 44;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size - 5],
    popupAnchor: [0, -size + 8],
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:999px 999px 999px 0;
      background:${color};transform:rotate(-45deg);
      box-shadow:0 8px 18px rgba(15,23,42,.28);
      border:4px solid white;position:relative;">
        <div style="
          position:absolute;left:50%;top:50%;width:${Math.round(size * 0.36)}px;height:${Math.round(size * 0.36)}px;
          border-radius:999px;background:white;transform:translate(-50%,-50%);"></div>
      </div>
      <div style="
        width:10px;height:10px;border-radius:999px;background:rgba(15,23,42,.22);
        margin:${active ? -1 : -3}px auto 0;"></div>`,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
