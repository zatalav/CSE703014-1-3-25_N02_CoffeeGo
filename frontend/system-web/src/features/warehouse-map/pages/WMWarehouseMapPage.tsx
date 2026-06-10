import { useEffect, useState } from "react";
import {
  Package, X, Box, Plus, Edit2, EyeOff, Eye,
  Trash2, Save, AlertTriangle, MapPin, Warehouse,
} from "lucide-react";
import { useAuth } from "../../../lib/auth";
import { loadInventoryData, type InventoryData, type InventoryIngredient } from "../../inventory-data";

// ─── Constants ────────────────────────────────────────────────────
const PRIMARY = "#1F4E3D";
const ACCENT = "#10B981";

const COLOR_PRESETS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B",
  "#10B981", "#EF4444", "#06B6D4", "#6B7280",
];

// ─── Types ────────────────────────────────────────────────────────
interface WarehouseSlot {
  zone: string;
  shelf: number;
  slot: number;
  ingredientId?: number;
  qty?: number;
  importDate?: string;
  expiry?: string;
}

interface SlotState extends WarehouseSlot {}

interface ZoneConfig {
  id: string;
  label: string;
  color: string;
}

interface ShelfConfig {
  zone: string;
  shelf: number;
  name: string;
  slotCount: number;
  hidden: boolean;
}

type DialogKind =
  | { kind: "slot-detail"; slot: SlotState }
  | { kind: "add-product"; slot: SlotState }
  | { kind: "edit-product"; slot: SlotState }
  | { kind: "delete-product"; slot: SlotState }
  | { kind: "edit-shelf"; shelf: ShelfConfig }
  | { kind: "add-location" }
  | null;

// ─── Initial data builders ────────────────────────────────────────
const INIT_ZONES: ZoneConfig[] = [
  { id: "A", label: "Bột & Trà", color: "#3B82F6" },
  { id: "B", label: "Sữa & Kem", color: "#8B5CF6" },
  { id: "C", label: "Topping", color: "#EC4899" },
  { id: "D", label: "Vật tư & Bao bì", color: "#F59E0B" },
];

const buildInitialShelves = (): ShelfConfig[] =>
  ["A", "B", "C", "D"].flatMap(zone =>
    [1, 2, 3].map(shelf => ({ zone, shelf, name: `Kệ ${shelf}`, slotCount: 5, hidden: false }))
  );

let runtimeIngredients: InventoryIngredient[] = [];
let runtimeCategories: string[] = [];

// ─── Helpers ──────────────────────────────────────────────────────
function getIngredient(id?: number) {
  return id ? runtimeIngredients.find(i => i.id === id) : undefined;
}

function buildSlotsFromData(data: InventoryData): SlotState[] {
  if (data.locations.length === 0) {
    return data.ingredients.map((ingredient, index) => ({
      zone: "A",
      shelf: Math.floor(index / 5) + 1,
      slot: (index % 5) + 1,
      ingredientId: ingredient.id,
      qty: ingredient.current,
    }));
  }

  return data.locations.map(location => {
    const stock = data.stocks.find(item => item.locationId === location.locationId);
    return {
      zone: location.zone || "A",
      shelf: Number(location.shelf || 1),
      slot: Number(location.slot || 1),
      ingredientId: stock?.ingredientId,
      qty: stock?.quantity || 0,
    };
  });
}

function buildZonesFromData(data: InventoryData): ZoneConfig[] {
  const zones = Array.from(new Set(data.locations.map(location => location.zone).filter(Boolean) as string[]));
  return (zones.length ? zones : ["A"]).map((zone, index) => ({
    id: zone,
    label: `Khu ${zone}`,
    color: COLOR_PRESETS[index % COLOR_PRESETS.length],
  }));
}

function buildShelvesFromData(data: InventoryData): ShelfConfig[] {
  const seen = new Set<string>();
  const shelves = data.locations
    .map(location => ({ zone: location.zone || "A", shelf: Number(location.shelf || 1) }))
    .filter(row => {
      const key = `${row.zone}-${row.shelf}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(row => ({
      zone: row.zone,
      shelf: row.shelf,
      name: `Kệ ${row.shelf}`,
      slotCount: Math.max(5, data.locations.filter(location => (location.zone || "A") === row.zone && Number(location.shelf || 1) === row.shelf).length),
      hidden: false,
    }));
  return shelves.length ? shelves : buildInitialShelves();
}

function slotAppearance(slot: SlotState) {
  if (!slot.ingredientId) {
    return { bg: "#F8FAFC", border: "#E2E8F0", text: "#94A3B8", badge: "Trống", isEmpty: true };
  }
  const ing = getIngredient(slot.ingredientId);
  if (!ing) return { bg: "#F8FAFC", border: "#E2E8F0", text: "#94A3B8", badge: "Trống", isEmpty: true };
  if (ing.current <= ing.minLevel * 0.5) return { bg: "#FEF2F2", border: "#FCA5A5", text: "#DC2626", badge: "Nguy cấp", isEmpty: false };
  if (ing.current <= ing.minLevel) return { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", badge: "Cảnh báo", isEmpty: false };
  return { bg: "#ECFDF5", border: "#A7F3D0", text: "#059669", badge: "Tốt", isEmpty: false };
}

// ─── Modal shell ──────────────────────────────────────────────────
function Modal({
  title, onClose, children, footer, width = 460,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <div
        className="relative bg-white rounded-2xl flex flex-col"
        style={{
          width,
          maxWidth: "95vw",
          maxHeight: "90vh",
          boxShadow: "0 32px 80px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900" style={{ fontSize: 15 }}>{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 transition-colors"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#F3F4F6"; (e.currentTarget as HTMLElement).style.color = "#374151"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "#9CA3AF"; }}
          >
            <X size={17} />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function CancelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 transition-colors"
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#F9FAFB"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
    >
      Hủy
    </button>
  );
}

function SaveBtn({ onClick, label, icon, color = ACCENT, disabled = false }: {
  onClick: () => void; label: string; icon?: React.ReactNode; color?: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ backgroundColor: color }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
    >
      {icon} {label}
    </button>
  );
}

// ─── Slot Detail Modal ────────────────────────────────────────────
function SlotDetailModal({
  slot, onClose, onEdit, onDelete,
}: {
  slot: SlotState;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ing = getIngredient(slot.ingredientId);
  const ap = slotAppearance(slot);

  return (
    <Modal
      title={`Chi tiết ô — Khu ${slot.zone} / Kệ ${slot.shelf} / Ô ${slot.slot}`}
      onClose={onClose}
      width={420}
      footer={
        <>
          <CancelBtn onClick={onClose} />
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
            style={{ borderColor: "#FCA5A5", color: "#DC2626" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#FEF2F2"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
          >
            <Trash2 size={14} /> Xóa sản phẩm
          </button>
          <SaveBtn onClick={onEdit} label="Chỉnh sửa" icon={<Edit2 size={14} />} />
        </>
      }
    >
      <div className="p-6 space-y-4">
        {/* Status banner */}
        <div
          className="flex items-center gap-3 p-4 rounded-2xl"
          style={{ backgroundColor: ap.bg, border: `2px solid ${ap.border}` }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: ap.border }}>
            <Package size={18} style={{ color: ap.text }} />
          </div>
          <div>
            <p className="font-bold text-gray-900">{ing?.name}</p>
            <span
              className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5"
              style={{ backgroundColor: ap.text + "20", color: ap.text }}
            >
              {ap.badge}
            </span>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Số lượng trong ô", value: `${slot.qty ?? "—"} ${ing?.unit ?? ""}`, highlight: true, color: ap.text },
            { label: "Tồn kho thực tế", value: `${ing?.current ?? "—"} ${ing?.unit ?? ""}`, highlight: false, color: "" },
            { label: "Mức tối thiểu", value: `${ing?.minLevel ?? "—"} ${ing?.unit ?? ""}`, highlight: false, color: "" },
            { label: "Giá trị ô", value: (ing && slot.qty) ? new Intl.NumberFormat("vi-VN").format(ing.price * slot.qty) + "đ" : "—", highlight: false, color: "" },
            { label: "Ngày nhập", value: slot.importDate || "—", highlight: false, color: "" },
            { label: "Hạn sử dụng", value: slot.expiry || "Không có", highlight: false, color: slot.expiry ? "#D97706" : "" },
          ].map((row, i) => (
            <div key={i} className="p-3 rounded-xl" style={{ backgroundColor: "#F9FAFB" }}>
              <p className="text-xs text-gray-400">{row.label}</p>
              <p
                className="text-sm font-semibold mt-0.5"
                style={{ color: row.highlight ? row.color : (row.color || "#111827") }}
              >
                {row.value}
              </p>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl" style={{ backgroundColor: "#F9FAFB" }}>
          <p className="text-xs text-gray-400">Nhà cung cấp</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5">{ing?.supplier ?? "—"}</p>
        </div>
      </div>
    </Modal>
  );
}

// ─── Product Form Modal (Add / Edit) ─────────────────────────────
function ProductFormModal({
  slot, mode, onClose, onSave,
}: {
  slot: SlotState;
  mode: "add" | "edit";
  onClose: () => void;
  onSave: (data: Partial<SlotState>) => void;
}) {
  const [ingredientId, setIngredientId] = useState(slot.ingredientId ?? 0);
  const [qty, setQty] = useState(slot.qty ?? 1);
  const [importDate, setImportDate] = useState(slot.importDate ?? "14/05/2026");
  const [expiry, setExpiry] = useState(slot.expiry ?? "");

  const selectedIng = runtimeIngredients.find(i => i.id === ingredientId);

  const handleSave = () => {
    if (!ingredientId) return;
    onSave({ ingredientId, qty, importDate, expiry: expiry || undefined });
    onClose();
  };

  return (
    <Modal
      title={mode === "add"
        ? `Thêm sản phẩm — Khu ${slot.zone} / Kệ ${slot.shelf} / Ô ${slot.slot}`
        : `Sửa sản phẩm — Khu ${slot.zone} / Kệ ${slot.shelf} / Ô ${slot.slot}`
      }
      onClose={onClose}
      footer={
        <>
          <CancelBtn onClick={onClose} />
          <SaveBtn
            onClick={handleSave}
            label={mode === "add" ? "Thêm sản phẩm" : "Lưu thay đổi"}
            icon={<Save size={14} />}
            disabled={!ingredientId}
          />
        </>
      }
    >
      <div className="p-6 space-y-5">
        {/* Ingredient picker */}
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-2 block">Nguyên liệu *</label>
          <select
            value={ingredientId}
            onChange={e => setIngredientId(Number(e.target.value))}
            className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
            style={{ borderColor: ingredientId ? ACCENT : "#E5E7EB" }}
          >
            <option value={0}>— Chọn nguyên liệu —</option>
            {runtimeCategories.map(cat => (
              <optgroup key={cat} label={cat}>
                {runtimeIngredients.filter(i => i.category === cat).map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Selected ingredient preview */}
        {selectedIng && (
          <div
            className="flex items-center gap-3 p-3 rounded-xl text-sm"
            style={{ backgroundColor: "#F0FDF4", border: "1px solid #A7F3D0" }}
          >
            <Package size={16} style={{ color: ACCENT, flexShrink: 0 }} />
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">{selectedIng.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Tồn kho: <strong>{selectedIng.current} {selectedIng.unit}</strong>
                &nbsp;·&nbsp;Giá: <strong>{new Intl.NumberFormat("vi-VN").format(selectedIng.price)}đ/{selectedIng.unit}</strong>
                &nbsp;·&nbsp;{selectedIng.supplier}
              </p>
            </div>
          </div>
        )}

        {/* Qty & dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">
              Số lượng{selectedIng ? ` (${selectedIng.unit})` : ""} *
            </label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={qty}
              onChange={e => setQty(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
              style={{ borderColor: "#E5E7EB" }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Ngày nhập</label>
            <input
              type="text"
              value={importDate}
              onChange={e => setImportDate(e.target.value)}
              placeholder="dd/mm/yyyy"
              className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
              style={{ borderColor: "#E5E7EB" }}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 mb-2 block">Hạn sử dụng (nếu có)</label>
          <input
            type="text"
            value={expiry}
            onChange={e => setExpiry(e.target.value)}
            placeholder="dd/mm/yyyy — để trống nếu không có"
            className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
            style={{ borderColor: "#E5E7EB" }}
          />
        </div>
      </div>
    </Modal>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────
function DeleteConfirmModal({
  slot, onClose, onConfirm,
}: {
  slot: SlotState;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const ing = getIngredient(slot.ingredientId);
  return (
    <Modal
      title="Xác nhận xóa sản phẩm"
      onClose={onClose}
      width={420}
      footer={
        <>
          <CancelBtn onClick={onClose} />
          <SaveBtn
            onClick={() => { onConfirm(); onClose(); }}
            label="Xóa sản phẩm"
            icon={<Trash2 size={14} />}
            color="#DC2626"
          />
        </>
      }
    >
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: "#FEF2F2" }}>
          <AlertTriangle size={20} style={{ color: "#DC2626", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-sm font-bold text-red-700">Xóa sản phẩm khỏi ô kho</p>
            <p className="text-xs text-red-600 mt-1">Ô sẽ trở thành trống. Hành động này không thể hoàn tác.</p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
          {[
            ["Vị trí", `Khu ${slot.zone} / Kệ ${slot.shelf} / Ô ${slot.slot}`],
            ["Nguyên liệu", ing?.name ?? "—"],
            ["Số lượng", `${slot.qty ?? "—"} ${ing?.unit ?? ""}`],
            ["Ngày nhập", slot.importDate ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center px-4 py-2.5">
              <span className="text-xs text-gray-500">{label}</span>
              <span className="text-xs font-semibold text-gray-800">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ─── Edit Shelf Modal ─────────────────────────────────────────────
function EditShelfModal({
  shelf, onClose, onSave,
}: {
  shelf: ShelfConfig;
  onClose: () => void;
  onSave: (data: Partial<ShelfConfig>) => void;
}) {
  const [name, setName] = useState(shelf.name);
  const [slotCount, setSlotCount] = useState(shelf.slotCount);

  return (
    <Modal
      title={`Sửa kệ — Khu ${shelf.zone} / Kệ ${shelf.shelf}`}
      onClose={onClose}
      width={400}
      footer={
        <>
          <CancelBtn onClick={onClose} />
          <SaveBtn
            onClick={() => { onSave({ name, slotCount }); onClose(); }}
            label="Lưu thay đổi"
            icon={<Save size={14} />}
          />
        </>
      }
    >
      <div className="p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-2 block">Tên kệ</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
            style={{ borderColor: "#E5E7EB" }}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-2 block">Số ô trên kệ</label>
          <input
            type="number"
            min={1}
            max={20}
            value={slotCount}
            onChange={e => setSlotCount(Math.min(20, Math.max(1, Number(e.target.value))))}
            className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
            style={{ borderColor: "#E5E7EB" }}
          />
          <p className="text-xs text-gray-400 mt-1.5">Tối đa 20 ô / kệ</p>
        </div>
      </div>
    </Modal>
  );
}

// ─── Add Location Modal ───────────────────────────────────────────
interface NewShelfRow {
  id: number;
  num: number;
  name: string;
  slotCount: number;
}

function AddLocationModal({
  existingZones, onClose, onSave,
}: {
  existingZones: ZoneConfig[];
  onClose: () => void;
  onSave: (zone: string, label: string, color: string, shelves: NewShelfRow[]) => void;
}) {
  const [zoneMode, setZoneMode] = useState<"existing" | "new">("existing");
  const [selectedZone, setSelectedZone] = useState(existingZones[0]?.id ?? "");
  const [newZoneId, setNewZoneId] = useState("");
  const [newZoneLabel, setNewZoneLabel] = useState("");
  const [newZoneColor, setNewZoneColor] = useState(COLOR_PRESETS[4]);
  const [shelfRows, setShelfRows] = useState<NewShelfRow[]>([
    { id: 1, num: 1, name: "Kệ 1", slotCount: 5 },
  ]);
  const [nextId, setNextId] = useState(2);

  const canSave = zoneMode === "existing"
    ? !!selectedZone
    : !!(newZoneId.trim() && newZoneLabel.trim());

  const addRow = () => {
    const newNum = shelfRows.length + 1;
    setShelfRows(prev => [...prev, { id: nextId, num: newNum, name: `Kệ ${newNum}`, slotCount: 5 }]);
    setNextId(n => n + 1);
  };

  const removeRow = (id: number) => {
    setShelfRows(prev => prev.filter(r => r.id !== id));
  };

  const updateRow = (id: number, patch: Partial<NewShelfRow>) => {
    setShelfRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const handleSave = () => {
    if (!canSave || shelfRows.length === 0) return;
    if (zoneMode === "existing") {
      const z = existingZones.find(x => x.id === selectedZone)!;
      onSave(z.id, z.label, z.color, shelfRows);
    } else {
      onSave(newZoneId.toUpperCase().trim(), newZoneLabel.trim(), newZoneColor, shelfRows);
    }
    onClose();
  };

  const totalSlots = shelfRows.reduce((t, r) => t + r.slotCount, 0);

  return (
    <Modal
      title="Thêm vị trí kho mới"
      onClose={onClose}
      width={560}
      footer={
        <>
          <CancelBtn onClick={onClose} />
          <SaveBtn
            onClick={handleSave}
            label="Tạo vị trí kho"
            icon={<Plus size={14} />}
            disabled={!canSave || shelfRows.length === 0}
          />
        </>
      }
    >
      <div className="p-6 space-y-6">
        {/* Step 1: Zone */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: PRIMARY }}>1</div>
            <p className="text-sm font-bold text-gray-700">Chọn khu vực</p>
          </div>

          <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-4">
            {(["existing", "new"] as const).map(m => (
              <button
                key={m}
                onClick={() => setZoneMode(m)}
                className="flex-1 py-2 text-sm font-medium transition-all"
                style={{
                  backgroundColor: zoneMode === m ? PRIMARY : "#fff",
                  color: zoneMode === m ? "#fff" : "#6B7280",
                }}
              >
                {m === "existing" ? "Khu hiện có" : "Tạo khu mới"}
              </button>
            ))}
          </div>

          {zoneMode === "existing" ? (
            <div className="grid grid-cols-2 gap-2">
              {existingZones.map(z => (
                <button
                  key={z.id}
                  onClick={() => setSelectedZone(z.id)}
                  className="flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all"
                  style={{
                    borderColor: selectedZone === z.id ? z.color : "#E5E7EB",
                    backgroundColor: selectedZone === z.id ? z.color + "10" : "#fff",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: z.color }}
                  >
                    {z.id}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800">Khu {z.id}</p>
                    <p className="text-xs text-gray-500 truncate">{z.label}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Mã khu *</label>
                  <input
                    type="text"
                    value={newZoneId}
                    onChange={e => setNewZoneId(e.target.value.toUpperCase().slice(0, 3))}
                    placeholder="VD: E, F1..."
                    className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
                    style={{ borderColor: "#E5E7EB" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Tên khu *</label>
                  <input
                    type="text"
                    value={newZoneLabel}
                    onChange={e => setNewZoneLabel(e.target.value)}
                    placeholder="VD: Đông lạnh..."
                    className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
                    style={{ borderColor: "#E5E7EB" }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Màu nhận diện</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewZoneColor(c)}
                      className="w-8 h-8 rounded-xl transition-all"
                      style={{
                        backgroundColor: c,
                        outline: newZoneColor === c ? `3px solid ${c}` : "3px solid transparent",
                        outlineOffset: 2,
                        transform: newZoneColor === c ? "scale(1.15)" : "scale(1)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-px" style={{ backgroundColor: "#F3F4F6" }} />

        {/* Step 2: Shelves */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: PRIMARY }}>2</div>
              <p className="text-sm font-bold text-gray-700">Cấu hình kệ</p>
            </div>
            <span className="text-xs text-gray-400">{shelfRows.length} kệ · {totalSlots} ô</span>
          </div>

          {/* Column headers */}
          <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: "52px 1fr 1fr 72px 32px" }}>
            <span className="text-xs font-semibold text-gray-500 text-center">STT</span>
            <span className="text-xs font-semibold text-gray-500">Tên kệ</span>
            <span className="text-xs font-semibold text-gray-500">Số ô</span>
            <span className="text-xs font-semibold text-gray-500 text-center">Tổng ô</span>
            <span />
          </div>

          {/* Shelf rows */}
          <div className="space-y-2">
            {shelfRows.map((row, idx) => (
              <div
                key={row.id}
                className="grid gap-2 items-center p-2.5 rounded-xl"
                style={{ gridTemplateColumns: "52px 1fr 1fr 72px 32px", backgroundColor: "#F9FAFB", border: "1px solid #F1F5F9" }}
              >
                {/* Shelf number */}
                <input
                  type="number"
                  min={1}
                  value={row.num}
                  onChange={e => {
                    const v = Number(e.target.value);
                    updateRow(row.id, { num: v, name: `Kệ ${v}` });
                  }}
                  className="w-full px-2 py-1.5 rounded-lg border text-xs text-center focus:outline-none bg-white"
                  style={{ borderColor: "#E5E7EB" }}
                />
                {/* Shelf name */}
                <input
                  type="text"
                  value={row.name}
                  onChange={e => updateRow(row.id, { name: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none bg-white"
                  style={{ borderColor: "#E5E7EB" }}
                />
                {/* Slot count */}
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={row.slotCount}
                  onChange={e => updateRow(row.id, { slotCount: Math.min(20, Math.max(1, Number(e.target.value))) })}
                  className="w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none bg-white"
                  style={{ borderColor: "#E5E7EB" }}
                />
                {/* Total label */}
                <div className="text-center">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: ACCENT + "20", color: ACCENT }}
                  >
                    {row.slotCount} ô
                  </span>
                </div>
                {/* Delete row */}
                <button
                  onClick={() => removeRow(row.id)}
                  disabled={shelfRows.length === 1}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ color: "#9CA3AF" }}
                  onMouseEnter={e => { if (shelfRows.length > 1) { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "#FEF2F2"; el.style.color = "#DC2626"; } }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "transparent"; el.style.color = "#9CA3AF"; }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Add shelf row button */}
          <button
            onClick={addRow}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-all"
            style={{ borderColor: ACCENT + "60", color: ACCENT }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "#F0FDF4"; el.style.borderColor = ACCENT; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "transparent"; el.style.borderColor = ACCENT + "60"; }}
          >
            <Plus size={14} /> Thêm kệ
          </button>

          <p className="text-xs text-gray-400 mt-2">
            Sẽ tạo tổng cộng <strong className="text-gray-600">{totalSlots} ô trống</strong> trên {shelfRows.length} kệ
          </p>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export function WMWarehouseMapPage() {
  const { session } = useAuth();
  const branchId = session?.userInfo?.branchId ?? null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [slots, setSlots] = useState<SlotState[]>([]);
  const [zones, setZones] = useState<ZoneConfig[]>(INIT_ZONES);
  const [shelves, setShelves] = useState<ShelfConfig[]>(buildInitialShelves);
  const [activeZone, setActiveZone] = useState("A");
  const [dialog, setDialog] = useState<DialogKind>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await loadInventoryData(branchId);
        runtimeIngredients = data.ingredients;
        runtimeCategories = data.categories.length ? data.categories : Array.from(new Set(data.ingredients.map(item => item.category)));
        const nextZones = buildZonesFromData(data);
        const nextSlots = buildSlotsFromData(data);
        const nextShelves = buildShelvesFromData(data);
        setZones(nextZones);
        setShelves(nextShelves);
        setSlots(nextSlots);
        setActiveZone(nextZones[0]?.id || "A");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không tải được sơ đồ kho.");
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [branchId]);

  // ── Slot CRUD ──────────────────────────────────────────────────
  const getSlot = (zone: string, shelf: number, slotNum: number): SlotState => {
    return slots.find(s => s.zone === zone && s.shelf === shelf && s.slot === slotNum)
      ?? { zone, shelf, slot: slotNum };
  };

  const putSlot = (zone: string, shelf: number, slotNum: number, data: Partial<SlotState>) => {
    setSlots(prev => {
      const idx = prev.findIndex(s => s.zone === zone && s.shelf === shelf && s.slot === slotNum);
      const updated: SlotState = { zone, shelf, slot: slotNum, ...data };
      return idx >= 0 ? prev.map((s, i) => i === idx ? { ...s, ...data } : s) : [...prev, updated];
    });
  };

  const clearSlot = (zone: string, shelf: number, slotNum: number) => {
    setSlots(prev => prev.map(s =>
      s.zone === zone && s.shelf === shelf && s.slot === slotNum
        ? { zone, shelf, slot: slotNum }
        : s
    ));
  };

  // ── Shelf helpers ──────────────────────────────────────────────
  const updateShelf = (zone: string, shelf: number, data: Partial<ShelfConfig>) =>
    setShelves(prev => prev.map(s => s.zone === zone && s.shelf === shelf ? { ...s, ...data } : s));

  const toggleHide = (zone: string, shelf: number) =>
    setShelves(prev => prev.map(s => s.zone === zone && s.shelf === shelf ? { ...s, hidden: !s.hidden } : s));

  // ── Add location ───────────────────────────────────────────────
  const handleAddLocation = (
    zone: string, label: string, color: string,
    newShelves: { id: number; num: number; name: string; slotCount: number }[]
  ) => {
    if (!zones.find(z => z.id === zone)) {
      setZones(prev => [...prev, { id: zone, label, color }]);
    }
    const toAdd = newShelves.filter(r => !shelves.find(s => s.zone === zone && s.shelf === r.num));
    if (toAdd.length > 0) {
      setShelves(prev => [
        ...prev,
        ...toAdd.map(r => ({ zone, shelf: r.num, name: r.name, slotCount: r.slotCount, hidden: false })),
      ]);
      setSlots(prev => [
        ...prev,
        ...toAdd.flatMap(r =>
          Array.from({ length: r.slotCount }, (_, i) => ({ zone, shelf: r.num, slot: i + 1 } as SlotState))
        ),
      ]);
    }
    setActiveZone(zone);
  };

  // ── Derived ────────────────────────────────────────────────────
  const activeZoneConfig = zones.find(z => z.id === activeZone);
  const activeShelves = shelves.filter(s => s.zone === activeZone).sort((a, b) => a.shelf - b.shelf);
  const zoneOccupied = slots.filter(s => s.zone === activeZone && s.ingredientId);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-900" style={{ fontSize: 20 }}>Sơ đồ vị trí kho</h2>
          <p className="text-sm text-gray-500 mt-0.5">Dữ liệu vị trí, tồn kho và nguyên liệu được tải từ database</p>
        </div>
        <button
          onClick={() => setDialog({ kind: "add-location" })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex-shrink-0"
          style={{ backgroundColor: PRIMARY }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.85"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
        >
          <Plus size={15} /> Thêm vị trí kho
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {loading && <div className="rounded-xl bg-white border border-gray-100 px-4 py-3 text-sm text-gray-400">Đang tải sơ đồ kho...</div>}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {[
          { bg: "#ECFDF5", border: "#A7F3D0", text: "#059669", label: "Tồn kho tốt" },
          { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", label: "Cảnh báo tồn kho" },
          { bg: "#FEF2F2", border: "#FCA5A5", text: "#DC2626", label: "Nguy cấp" },
          { bg: "#F8FAFC", border: "#E2E8F0", text: "#94A3B8", label: "Ô trống — nhấn để thêm" },
        ].map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md border-2" style={{ backgroundColor: l.bg, borderColor: l.border }} />
            <span className="text-xs" style={{ color: l.text }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* ── Left: zone map ──────────────────────────────────── */}
        <div className="xl:col-span-3 space-y-4">
          {/* Zone tabs */}
          <div className="flex gap-2 flex-wrap">
            {zones.map(z => (
              <button
                key={z.id}
                onClick={() => setActiveZone(z.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
                style={{
                  borderColor: activeZone === z.id ? z.color : "#E5E7EB",
                  backgroundColor: activeZone === z.id ? z.color : "#fff",
                  color: activeZone === z.id ? "#fff" : "#6B7280",
                  boxShadow: activeZone === z.id ? `0 4px 12px ${z.color}55` : "none",
                }}
              >
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-black"
                  style={{
                    backgroundColor: activeZone === z.id ? "rgba(255,255,255,0.25)" : z.color + "20",
                    color: activeZone === z.id ? "#fff" : z.color,
                  }}
                >
                  {z.id}
                </span>
                {z.label}
              </button>
            ))}
          </div>

          {/* Zone card */}
          {activeZoneConfig && (
            <div
              className="bg-white rounded-2xl p-5 border border-gray-100"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}
            >
              {/* Zone header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black"
                    style={{ backgroundColor: activeZoneConfig.color }}
                  >
                    {activeZone}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Khu {activeZone} — {activeZoneConfig.label}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {zoneOccupied.length} ô đang dùng ·{" "}
                      {activeShelves.filter(s => !s.hidden).reduce((t, s) => t + s.slotCount, 0) - zoneOccupied.length} ô trống
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <MapPin size={12} style={{ color: activeZoneConfig.color }} />
                  Nhấn ô để thao tác
                </div>
              </div>

              {activeShelves.length === 0 ? (
                <div className="py-12 text-center">
                  <Warehouse size={36} className="mx-auto mb-3" style={{ color: "#CBD5E1" }} />
                  <p className="text-sm text-gray-400">Khu này chưa có kệ nào</p>
                  <button
                    onClick={() => setDialog({ kind: "add-location" })}
                    className="mt-3 text-sm font-semibold"
                    style={{ color: ACCENT }}
                  >
                    + Thêm kệ mới
                  </button>
                </div>
              ) : (
                activeShelves.map(shelfCfg => (
                  <div key={`${shelfCfg.zone}-${shelfCfg.shelf}`} className="mb-6 last:mb-0">
                    {/* Shelf header row */}
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold flex-shrink-0"
                        style={{
                          backgroundColor: activeZoneConfig.color + "15",
                          color: activeZoneConfig.color,
                        }}
                      >
                        <Box size={12} /> {shelfCfg.name}
                      </div>

                      {/* Edit shelf */}
                      <button
                        onClick={() => setDialog({ kind: "edit-shelf", shelf: shelfCfg })}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                        style={{ borderColor: "#E5E7EB", color: "#6B7280" }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "#F9FAFB"; el.style.borderColor = "#9CA3AF"; el.style.color = "#374151"; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "transparent"; el.style.borderColor = "#E5E7EB"; el.style.color = "#6B7280"; }}
                      >
                        <Edit2 size={10} /> Sửa
                      </button>

                      {/* Hide/show shelf */}
                      <button
                        onClick={() => toggleHide(shelfCfg.zone, shelfCfg.shelf)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                        style={{
                          borderColor: shelfCfg.hidden ? ACCENT : "#E5E7EB",
                          color: shelfCfg.hidden ? ACCENT : "#6B7280",
                          backgroundColor: shelfCfg.hidden ? "#F0FDF4" : "transparent",
                        }}
                        onMouseEnter={e => { if (!shelfCfg.hidden) { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "#F9FAFB"; } }}
                        onMouseLeave={e => { if (!shelfCfg.hidden) { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "transparent"; } }}
                      >
                        {shelfCfg.hidden ? <><Eye size={10} /> Hiện</> : <><EyeOff size={10} /> Ẩn</>}
                      </button>

                      <div className="flex-1 h-px" style={{ backgroundColor: "#F1F5F9" }} />
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {slots.filter(s => s.zone === shelfCfg.zone && s.shelf === shelfCfg.shelf && s.ingredientId).length}/{shelfCfg.slotCount}
                      </span>
                    </div>

                    {/* Slots grid */}
                    {shelfCfg.hidden ? (
                      <div
                        className="flex items-center justify-between px-4 py-3 rounded-xl text-xs"
                        style={{ backgroundColor: "#F8FAFC", border: "1.5px dashed #E2E8F0" }}
                      >
                        <div className="flex items-center gap-2 text-gray-400">
                          <EyeOff size={12} />
                          <span>Kệ này đang ẩn — {shelfCfg.slotCount} ô không hiển thị</span>
                        </div>
                        <button
                          onClick={() => toggleHide(shelfCfg.zone, shelfCfg.shelf)}
                          className="font-semibold transition-colors"
                          style={{ color: ACCENT }}
                        >
                          Hiện lại
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2.5 flex-wrap">
                        {Array.from({ length: shelfCfg.slotCount }, (_, si) => {
                          const slotNum = si + 1;
                          const slotData = getSlot(shelfCfg.zone, shelfCfg.shelf, slotNum);
                          const ap = slotAppearance(slotData);
                          const ing = getIngredient(slotData.ingredientId);

                          return (
                            <button
                              key={slotNum}
                              className="relative rounded-xl border-2 text-left transition-all group"
                              style={{
                                width: 144,
                                minHeight: 84,
                                backgroundColor: ap.bg,
                                borderColor: ap.border,
                              }}
                              onClick={() => {
                                if (ap.isEmpty) {
                                  setDialog({ kind: "add-product", slot: slotData });
                                } else {
                                  setDialog({ kind: "slot-detail", slot: slotData });
                                }
                              }}
                              onMouseEnter={e => {
                                const el = e.currentTarget as HTMLElement;
                                el.style.transform = "translateY(-3px)";
                                el.style.boxShadow = `0 8px 20px ${activeZoneConfig.color}30`;
                                el.style.borderColor = activeZoneConfig.color;
                              }}
                              onMouseLeave={e => {
                                const el = e.currentTarget as HTMLElement;
                                el.style.transform = "none";
                                el.style.boxShadow = "none";
                                el.style.borderColor = ap.border;
                              }}
                            >
                              {/* Slot number */}
                              <span
                                className="absolute top-1.5 left-2 font-bold"
                                style={{ fontSize: 10, color: ap.isEmpty ? "#CBD5E1" : ap.text }}
                              >
                                Ô {slotNum}
                              </span>

                              {/* Status dot for occupied */}
                              {!ap.isEmpty && (
                                <span
                                  className="absolute top-1.5 right-2 w-2 h-2 rounded-full"
                                  style={{ backgroundColor: ap.text }}
                                />
                              )}

                              {ap.isEmpty ? (
                                /* Empty slot */
                                <div className="flex flex-col items-center justify-center w-full h-full py-3 pt-5">
                                  <div
                                    className="w-9 h-9 rounded-xl border-2 border-dashed flex items-center justify-center transition-all"
                                    style={{ borderColor: "#CBD5E1" }}
                                  >
                                    <Plus size={15} style={{ color: "#CBD5E1" }} />
                                  </div>
                                  <span className="text-xs mt-1.5" style={{ color: "#CBD5E1" }}>Ô trống</span>
                                </div>
                              ) : (
                                /* Occupied slot */
                                <div className="p-2 pt-5">
                                  <p
                                    className="text-xs font-bold text-gray-800 leading-snug overflow-hidden"
                                    style={{
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical" as const,
                                      overflow: "hidden",
                                    } as React.CSSProperties}
                                  >
                                    {ing?.name}
                                  </p>
                                  <p className="text-xs font-bold mt-1" style={{ color: ap.text }}>
                                    {slotData.qty} {ing?.unit}
                                  </p>
                                  {slotData.expiry && (
                                    <p className="text-xs mt-0.5" style={{ color: "#94A3B8", fontSize: 10 }}>
                                      HSD {slotData.expiry}
                                    </p>
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Right sidebar ────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Current zone shelf overview */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <h3 className="font-bold text-gray-800 text-sm mb-3">Kệ trong khu {activeZone}</h3>
            <div className="space-y-2.5">
              {activeShelves.filter(s => !s.hidden).map(s => {
                const used = slots.filter(sl => sl.zone === s.zone && sl.shelf === s.shelf && sl.ingredientId).length;
                const pct = Math.round((used / s.slotCount) * 100);
                return (
                  <div key={s.shelf}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">{s.name}</span>
                      <span className="text-xs font-bold text-gray-700">{used}/{s.slotCount}</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ backgroundColor: "#F1F5F9" }}>
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: activeZoneConfig?.color ?? ACCENT }}
                      />
                    </div>
                  </div>
                );
              })}
              {activeShelves.filter(s => !s.hidden).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">Không có kệ nào hiển thị</p>
              )}
            </div>
          </div>

          {/* All zones overview */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <h3 className="font-bold text-gray-800 text-sm mb-3">Tổng quan kho</h3>
            <div className="space-y-2.5">
              {zones.map(z => {
                const total = shelves.filter(s => s.zone === z.id).reduce((t, s) => t + s.slotCount, 0);
                const used = slots.filter(s => s.zone === z.id && s.ingredientId).length;
                return (
                  <button key={z.id} onClick={() => setActiveZone(z.id)} className="w-full text-left">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded flex items-center justify-center text-white font-black"
                          style={{ backgroundColor: z.color, fontSize: 9 }}
                        >
                          {z.id}
                        </div>
                        <span className="text-xs text-gray-600">{z.label}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-700">{used}/{total}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: "#F1F5F9" }}>
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: total ? `${Math.round((used / total) * 100)}%` : "0%", backgroundColor: z.color }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Products in current zone */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <h3 className="font-bold text-gray-800 text-sm mb-3">Sản phẩm trong khu {activeZone}</h3>
            <div className="space-y-2">
              {zoneOccupied.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">Chưa có sản phẩm nào</p>
              ) : (
                zoneOccupied.map(slot => {
                  const ing = getIngredient(slot.ingredientId);
                  const ap = slotAppearance(slot);
                  return (
                    <div
                      key={`${slot.zone}-${slot.shelf}-${slot.slot}`}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl"
                      style={{ backgroundColor: ap.bg }}
                    >
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: ap.border }}
                      >
                        <Package size={11} style={{ color: ap.text }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{ing?.name}</p>
                        <p className="text-xs" style={{ color: ap.text }}>
                          {slot.qty} {ing?.unit} · Kệ {slot.shelf}/Ô {slot.slot}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full location table */}
      <div className="bg-white rounded-2xl border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Danh sách toàn bộ vị trí</h3>
          <span className="text-xs text-gray-400">{slots.filter(s => s.ingredientId).length} vị trí đang sử dụng</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB" }}>
                {["Nguyên liệu", "Vị trí", "Số lượng", "Ngày nhập", "Hạn SD", "Trạng thái", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.filter(s => s.ingredientId).map((slot, idx) => {
                const ing = getIngredient(slot.ingredientId)!;
                const ap = slotAppearance(slot);
                return (
                  <tr
                    key={idx}
                    className="border-t"
                    style={{ borderColor: "#F3F4F6" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#F9FAFB"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                  >
                    <td className="px-4 py-3 text-xs font-semibold text-gray-800">{ing.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">Khu {slot.zone} / Kệ {slot.shelf} / Ô {slot.slot}</td>
                    <td className="px-4 py-3 text-xs font-bold" style={{ color: ap.text }}>{slot.qty} {ing.unit}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{slot.importDate || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{slot.expiry || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: ap.bg, color: ap.text, border: `1px solid ${ap.border}` }}
                      >
                        {ap.badge}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setDialog({ kind: "edit-product", slot })}
                          className="p-1.5 rounded-lg text-gray-400 transition-colors"
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "#F3F4F6"; el.style.color = PRIMARY; }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "transparent"; el.style.color = "#9CA3AF"; }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setDialog({ kind: "delete-product", slot })}
                          className="p-1.5 rounded-lg text-gray-400 transition-colors"
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "#FEF2F2"; el.style.color = "#DC2626"; }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "transparent"; el.style.color = "#9CA3AF"; }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {slots.filter(s => s.ingredientId).length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-gray-400">
                    Chưa có sản phẩm nào trong kho
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Dialog renderer ── */}

      {dialog?.kind === "slot-detail" && (
        <SlotDetailModal
          slot={dialog.slot}
          onClose={() => setDialog(null)}
          onEdit={() => setDialog({ kind: "edit-product", slot: dialog.slot })}
          onDelete={() => setDialog({ kind: "delete-product", slot: dialog.slot })}
        />
      )}

      {dialog?.kind === "add-product" && (
        <ProductFormModal
          slot={dialog.slot}
          mode="add"
          onClose={() => setDialog(null)}
          onSave={data => putSlot(dialog.slot.zone, dialog.slot.shelf, dialog.slot.slot, data)}
        />
      )}

      {dialog?.kind === "edit-product" && (
        <ProductFormModal
          slot={dialog.slot}
          mode="edit"
          onClose={() => setDialog(null)}
          onSave={data => putSlot(dialog.slot.zone, dialog.slot.shelf, dialog.slot.slot, data)}
        />
      )}

      {dialog?.kind === "delete-product" && (
        <DeleteConfirmModal
          slot={dialog.slot}
          onClose={() => setDialog(null)}
          onConfirm={() => clearSlot(dialog.slot.zone, dialog.slot.shelf, dialog.slot.slot)}
        />
      )}

      {dialog?.kind === "edit-shelf" && (
        <EditShelfModal
          shelf={dialog.shelf}
          onClose={() => setDialog(null)}
          onSave={data => updateShelf(dialog.shelf.zone, dialog.shelf.shelf, data)}
        />
      )}

      {dialog?.kind === "add-location" && (
        <AddLocationModal
          existingZones={zones}
          onClose={() => setDialog(null)}
          onSave={(zone, label, color, shelves) => handleAddLocation(zone, label, color, shelves)}
        />
      )}
    </div>
  );
}
