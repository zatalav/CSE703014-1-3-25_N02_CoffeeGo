import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { StoreLeafletMap } from "../components/StoreLeafletMap";
import { usePublicStores, type StoreLocation } from "../storeLocations";
import {
  Clock,
  Crosshair,
  Layers,
  LocateFixed,
  MapPin,
  Maximize2,
  Minus,
  Navigation,
  Phone,
  Plus,
  Search,
  Store,
} from "lucide-react";

type TileMode = "standard" | "humanitarian";
type ZoomCommand = { action: "in" | "out"; tick: number };

function mapsUrl(store: StoreLocation) {
  return `https://www.openstreetmap.org/?mlat=${store.lat}&mlon=${store.lng}#map=17/${store.lat}/${store.lng}`;
}

function storeArea(store: StoreLocation) {
  const parts = store.address.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 2] : parts[0] || store.name;
}

function telUrl(phone: string) {
  return `tel:${phone.replace(/\s/g, "")}`;
}

export default function Stores() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const { stores: branchStores, loading, error } = usePublicStores();
  const [active, setActive] = useState(0);
  const [search, setSearch] = useState("");
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [tileMode, setTileMode] = useState<TileMode>("standard");
  const [locateSignal, setLocateSignal] = useState(0);
  const [zoomCommand, setZoomCommand] = useState<ZoomCommand | null>(null);

  useEffect(() => {
    if (!branchStores.length) {
      setActive(0);
      return;
    }
    if (!branchStores.some((store) => store.id === active)) {
      setActive(branchStores[0].id);
    }
  }, [active, branchStores]);

  const filteredStores = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return branchStores.filter((store) => {
      const matchesKeyword =
        !keyword ||
        store.name.toLowerCase().includes(keyword) ||
        store.address.toLowerCase().includes(keyword);
      const matchesStatus = !showOpenOnly || store.open;
      return matchesKeyword && matchesStatus;
    });
  }, [branchStores, search, showOpenOnly]);

  const current = filteredStores.find((store) => store.id === active) ?? filteredStores[0] ?? branchStores[0];

  return (
    <section ref={sectionRef} className="h-[calc(100vh-4.5rem)] min-h-[720px] overflow-hidden bg-[--bg-primary]">
      <div className="relative h-full w-full">
        <StoreLeafletMap
          stores={filteredStores}
          activeId={current?.id ?? 0}
          tileMode={tileMode}
          locateSignal={locateSignal}
          zoomCommand={zoomCommand}
          onSelect={setActive}
        />

        <div className="absolute left-4 right-4 top-4 z-30 flex flex-col gap-3 lg:left-[420px] lg:right-6 lg:flex-row lg:items-start lg:justify-between">
          <div
            className="flex w-full max-w-2xl items-center gap-3 rounded-lg px-4 py-3"
            style={{
              background: "white",
              border: "1px solid var(--border-line)",
              boxShadow: "0 2px 10px rgba(92,51,23,0.16)",
            }}
          >
            <Search size={20} color="var(--text-secondary)" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm cửa hàng CoffeeGo, quận, thành phố..."
              className="min-w-0 flex-1 bg-transparent outline-none"
              style={{ color: "var(--text-primary)", fontSize: 16 }}
            />
            <button
              type="button"
              onClick={() => setShowOpenOnly((value) => !value)}
              className="hidden items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium sm:inline-flex"
              style={{
                background: showOpenOnly ? "rgba(74,124,69,0.12)" : "var(--bg-section)",
                color: showOpenOnly ? "var(--success)" : "var(--text-secondary)",
                border: "1px solid var(--border-line)",
              }}
            >
              <Store size={16} />
              Đang mở
            </button>
          </div>

          <div className="flex items-center gap-2">
            <MapControlButton
              label="Lớp bản đồ"
              onClick={() => setTileMode((value) => value === "standard" ? "humanitarian" : "standard")}
            >
              <Layers size={19} />
            </MapControlButton>
            <MapControlButton
              label="Toàn màn hình"
              onClick={() => sectionRef.current?.requestFullscreen?.()}
            >
              <Maximize2 size={18} />
            </MapControlButton>
            <button
              type="button"
              onClick={() => setLocateSignal((value) => value + 1)}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-3 font-semibold"
              style={{
                background: "white",
                color: "var(--text-primary)",
                border: "1px solid var(--border-line)",
                boxShadow: "0 2px 10px rgba(92,51,23,0.14)",
              }}
            >
              <LocateFixed size={18} />
              Vị trí của tôi
            </button>
          </div>
        </div>

        <aside
          className="absolute bottom-0 left-0 top-0 z-40 hidden w-[392px] flex-col bg-white lg:flex"
          style={{ boxShadow: "4px 0 18px rgba(92,51,23,0.14)" }}
        >
          <StorePanel
            current={current}
            filteredStores={filteredStores}
            active={active}
            setActive={setActive}
            loading={loading}
            error={error}
            resetFilters={() => {
              setSearch("");
              setShowOpenOnly(false);
            }}
          />
        </aside>

        <div className="absolute bottom-28 right-4 z-30 overflow-hidden rounded-lg bg-white lg:bottom-24 lg:right-6" style={{ boxShadow: "0 2px 10px rgba(92,51,23,0.16)" }}>
          <button
            type="button"
            onClick={() => setZoomCommand((current) => ({ action: "in", tick: (current?.tick ?? 0) + 1 }))}
            className="grid h-10 w-10 place-items-center border-b"
            style={{ borderColor: "var(--border-line)", color: "var(--text-secondary)" }}
          >
            <Plus size={19} />
          </button>
          <button
            type="button"
            onClick={() => setZoomCommand((current) => ({ action: "out", tick: (current?.tick ?? 0) + 1 }))}
            className="grid h-10 w-10 place-items-center"
            style={{ color: "var(--text-secondary)" }}
          >
            <Minus size={19} />
          </button>
        </div>

        <div className="absolute bottom-4 right-4 z-30 hidden items-center gap-2 text-[11px] text-[--text-secondary] md:flex">
          <span className="rounded bg-white/90 px-2 py-1">Map data ©2026 CoffeeGo</span>
          <span className="rounded bg-white/90 px-2 py-1">Terms</span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-40 rounded-t-2xl bg-white lg:hidden" style={{ boxShadow: "0 -6px 22px rgba(92,51,23,0.16)" }}>
          <StorePanel
            current={current}
            filteredStores={filteredStores}
            active={active}
            setActive={setActive}
            loading={loading}
            error={error}
            resetFilters={() => {
              setSearch("");
              setShowOpenOnly(false);
            }}
            compact
          />
        </div>
      </div>
    </section>
  );
}

function MapControlButton({ label, onClick, children }: { label: string; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-11 w-11 place-items-center rounded-lg"
      style={{
        background: "white",
        color: "var(--text-secondary)",
        border: "1px solid var(--border-line)",
        boxShadow: "0 2px 10px rgba(92,51,23,0.14)",
      }}
    >
      {children}
    </button>
  );
}

function StorePanel({
  current,
  filteredStores,
  active,
  setActive,
  loading,
  error,
  resetFilters,
  compact = false,
}: {
  current?: StoreLocation;
  filteredStores: StoreLocation[];
  active: number;
  setActive: (id: number) => void;
  loading: boolean;
  error: string | null;
  resetFilters: () => void;
  compact?: boolean;
}) {
  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold text-[--text-primary]">Đang tải cửa hàng</h2>
        <p className="mt-2 text-sm text-[--text-secondary]">Danh sách chi nhánh đang được lấy từ database.</p>
      </div>
    );
  }

  if (filteredStores.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold text-[--text-primary]">Không tìm thấy cửa hàng</h2>
        <p className="mt-2 text-sm text-[--text-secondary]">
          {error ? "Không tải được chi nhánh từ API, đang dùng dữ liệu dự phòng." : "Thử tìm bằng tên quán, quận hoặc thành phố khác."}
        </p>
        <button
          type="button"
          onClick={resetFilters}
          className="mt-5 rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}
        >
          Xóa bộ lọc
        </button>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className={compact ? "max-h-[44vh] overflow-y-auto p-4" : "flex h-full flex-col overflow-hidden"}>
      <div className={compact ? "" : "border-b p-6"} style={{ borderColor: "var(--border-line)" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold leading-tight text-[--text-primary]">{current.name}</h1>
            <p className="mt-1 text-sm text-[--text-secondary]">{storeArea(current)}</p>
          </div>
          <span
            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: current.open ? "rgba(74,124,69,0.12)" : "rgba(192,57,43,0.12)",
              color: current.open ? "var(--success)" : "var(--error)",
            }}
          >
            {current.open ? "Đang mở" : "Đã đóng"}
          </span>
        </div>

        <div className="mt-5 space-y-3 text-sm text-[--text-secondary]">
          <InfoLine icon={<MapPin size={18} />} text={current.address} />
          <InfoLine icon={<Clock size={18} />} text={current.hours} />
          <InfoLine icon={<Phone size={18} />} text={current.phone} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <a
            href={mapsUrl(current)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
            style={{ background: "var(--brand-brown)", color: "var(--bg-primary)" }}
          >
            <Navigation size={17} />
            Chỉ đường
          </a>
          <a
            href={telUrl(current.phone)}
            className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
            style={{ color: "var(--brand-brown)", border: "1px solid var(--border-line)", background: "white" }}
          >
            <Phone size={17} />
            Gọi quán
          </a>
        </div>
      </div>

      <div className={compact ? "mt-4 flex gap-2 overflow-x-auto pb-1" : "min-h-0 flex-1 overflow-y-auto p-3"}>
        {!compact && (
          <div className="px-3 pb-2 text-sm font-medium text-[--text-secondary]">
            {filteredStores.length} cửa hàng phù hợp
          </div>
        )}
        {filteredStores.map((store) => {
          const selected = store.id === active;
          return (
            <button
              key={store.id}
              type="button"
              onClick={() => setActive(store.id)}
              className={compact ? "min-w-[220px] rounded-xl p-3 text-left" : "mb-2 w-full rounded-xl p-4 text-left transition"}
              style={{
                background: selected ? "var(--bg-section)" : "white",
                border: "1px solid " + (selected ? "var(--brand-hover)" : "var(--border-line)"),
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full"
                  style={{ background: selected ? "var(--brand-brown)" : "rgba(192,57,43,0.12)", color: selected ? "var(--bg-primary)" : "var(--error)" }}
                >
                  <Crosshair size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[--text-primary]">{store.name}</span>
                  <span className="mt-1 block truncate text-xs text-[--text-secondary]">{store.address}</span>
                  <span className="mt-2 block text-xs font-medium" style={{ color: store.open ? "var(--success)" : "var(--error)" }}>
                    {store.open ? "Đang mở" : "Đã đóng"} · {store.hours}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InfoLine({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-[--text-secondary]">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
