import { useEffect, useMemo, useState } from "react";
import { Clock, ExternalLink, MapPin, Navigation, Search } from "lucide-react";
import { fmt, statusMeta, t } from "./theme";
import type { Order } from "./types";
import type { PageType } from "../App";
import { LeafletMap } from "../../../shared/map/LeafletMap";
import { DEFAULT_OSM_POINT, geocodeAddress, openStreetMapMarkerUrl, openStreetMapSearchUrl } from "../../../shared/map/osm";

interface Props {
  navigate: (page: PageType, params?: { orderId?: string }) => void;
  orders: Order[];
}

const fallbackQuery = "Ha Noi, Viet Nam";

function mapsQuery(order?: Order) {
  const address = order?.address?.trim();
  return address && !address.toLowerCase().includes("chua co dia chi") ? address : fallbackQuery;
}

export default function MapPage({ navigate, orders }: Props) {
  const active = useMemo(
    () => orders.filter((o) => o.status === "new" || o.status === "picked" || o.status === "delivering"),
    [orders],
  );
  const [selected, setSelected] = useState(active[0]?.id ?? null);
  const selectedOrder = active.find((order) => order.id === selected) || active[0];
  const queryText = mapsQuery(selectedOrder);
  const [selectedPoint, setSelectedPoint] = useState(DEFAULT_OSM_POINT);
  const mapsUrl = selectedOrder ? openStreetMapMarkerUrl(selectedPoint) : openStreetMapSearchUrl(queryText);

  useEffect(() => {
    let cancelled = false;
    void geocodeAddress(queryText).then((point) => {
      if (!cancelled) setSelectedPoint(point);
    });
    return () => {
      cancelled = true;
    };
  }, [queryText]);

  return (
    <div className="h-full flex">
      <div className="flex-1 relative" style={{ background: t.surface2 }}>
        <LeafletMap
          markers={selectedOrder ? [{
            id: selectedOrder.id,
            lat: selectedPoint.lat,
            lng: selectedPoint.lng,
            title: selectedOrder.customerName,
            description: selectedOrder.address,
            active: true,
          }] : []}
          center={selectedPoint}
          zoom={15}
          className="block h-full w-full"
          style={{ minHeight: "100%" }}
        />

        <div
          className="absolute top-6 left-6 flex items-center gap-2 rounded-lg"
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            padding: "0 14px",
            height: 44,
            width: 420,
          }}
        >
          <Search size={16} style={{ color: t.textDim }} />
          <input
            value={selectedOrder?.address || ""}
            readOnly
            placeholder="Tìm địa chỉ, khu vực..."
            className="flex-1 bg-transparent outline-none"
            style={{ color: t.text, fontSize: 14 }}
          />
        </div>

        <button
          onClick={() => window.open(mapsUrl, "_blank", "noopener,noreferrer")}
          className="absolute bottom-6 right-6 rounded-lg flex items-center gap-2"
          style={{
            background: t.surface,
            color: t.text,
            border: `1px solid ${t.border}`,
            padding: "10px 14px",
            fontSize: 13,
          }}
        >
          <Navigation size={14} style={{ color: t.accent }} /> Mở OpenStreetMap
        </button>
      </div>

      <aside
        className="shrink-0 flex flex-col"
        style={{ width: 380, background: t.surface, borderLeft: `1px solid ${t.border}` }}
      >
        <div className="px-6 py-5" style={{ borderBottom: `1px solid ${t.border}` }}>
          <h2 style={{ color: t.text, fontSize: 16, fontWeight: 600 }}>Điểm giao hôm nay</h2>
          <div style={{ color: t.textMuted, fontSize: 13, marginTop: 4 }}>
            {active.length} đơn đang trong tuyến
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {active.map((o, i) => {
            const meta = statusMeta[o.status];
            const isSel = selected === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setSelected(o.id)}
                className="w-full text-left rounded-lg p-4 transition-colors"
                style={{
                  background: isSel ? t.surface3 : t.surface2,
                  border: `1px solid ${isSel ? t.borderStrong : t.border}`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="rounded-full flex items-center justify-center shrink-0"
                    style={{
                      width: 28,
                      height: 28,
                      background: meta.soft,
                      color: meta.color,
                      fontSize: 13,
                      fontWeight: 600,
                      border: `1px solid ${meta.border}`,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ color: t.text, fontSize: 14, fontWeight: 500 }}>
                      {o.customerName}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1" style={{ color: t.textMuted, fontSize: 12 }}>
                      <MapPin size={11} />
                      <span className="truncate">{o.address}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span
                        className="rounded-md"
                        style={{
                          background: meta.soft,
                          color: meta.color,
                          fontSize: 11,
                          padding: "2px 7px",
                          border: `1px solid ${meta.border}`,
                        }}
                      >
                        {meta.label}
                      </span>
                      <span className="flex items-center gap-1" style={{ color: t.textDim, fontSize: 11 }}>
                        <Clock size={11} /> {o.time}
                      </span>
                      <span style={{ color: t.text, fontSize: 12, fontWeight: 600, marginLeft: "auto" }}>
                        {fmt(o.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="p-4" style={{ borderTop: `1px solid ${t.border}` }}>
            <button
              onClick={() => navigate("orderDetail", { orderId: selected })}
              className="w-full rounded-lg"
              style={{
                background: t.accent,
                color: "#0A0A0B",
                padding: "10px 14px",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Xem chi tiết đơn
            </button>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 w-full rounded-lg flex items-center justify-center gap-2"
              style={{
                background: t.surface2,
                color: t.text,
                border: `1px solid ${t.border}`,
                padding: "10px 14px",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <ExternalLink size={14} /> Mở OpenStreetMap
            </a>
          </div>
        )}
      </aside>
    </div>
  );
}
