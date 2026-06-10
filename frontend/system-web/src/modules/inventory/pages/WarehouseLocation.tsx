import { useEffect, useState } from "react";
import { MapPin, Info, Printer, Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import type { PageResponse } from "../../../lib/types";

const zones = ["A", "B", "C"];
const shelves = [1, 2, 3, 4];
const slots = [1, 2, 3, 4, 5];

type Item = { locationId?: number; branchId?: number; name: string; qty: number; unit: string; expiry: string; added: string };

type WarehouseLocationDto = {
  locationId: number;
  branchId?: number | null;
  zone?: string | null;
  shelf?: string | null;
  slot?: string | null;
};

type WarehouseLocationRequest = {
  branchId: number;
  zone: string;
  shelf: string;
  slot: string;
};

const initialInventory: Record<string, Item> = {};

const emptyItem: Item = { name: "", qty: 0, unit: "kg", expiry: "", added: "" };

const pageItems = <T,>(data: PageResponse<T> | T[] | null | undefined) => {
  if (!data) return [];
  return Array.isArray(data) ? data : data.items ?? [];
};

const locationKey = (location: Pick<WarehouseLocationDto, "zone" | "shelf" | "slot">) => (
  `${location.zone || "A"}-${location.shelf || "1"}-${location.slot || "1"}`
);

const toInventoryItem = (location: WarehouseLocationDto): Item => ({
  locationId: location.locationId,
  branchId: Number(location.branchId || 1),
  name: `Vi tri kho #${location.locationId}`,
  qty: 0,
  unit: "",
  expiry: "",
  added: "",
});

export function WarehouseLocation() {
  const { session } = useAuth();
  const branchId = session?.userInfo?.branchId ?? null;
  const [inventory, setInventory] = useState<Record<string, Item>>(initialInventory);
  const [selected, setSelected] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formKey, setFormKey] = useState<string>("");
  const [formZone, setFormZone] = useState("A");
  const [formShelf, setFormShelf] = useState(1);
  const [formSlot, setFormSlot] = useState(1);
  const [formItem, setFormItem] = useState<Item>(emptyItem);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const selectedData = selected ? inventory[selected] : null;

  const loadLocations = async () => {
    try {
      const scoped = branchId ? `&branchId=${branchId}` : "";
      const data = await api.get<PageResponse<WarehouseLocationDto> | WarehouseLocationDto[]>(`/admin/inventory/locations?size=500&sort=locationId,asc${scoped}`);
      const next = pageItems(data).reduce<Record<string, Item>>((acc, location) => {
        acc[locationKey(location)] = toInventoryItem(location);
        return acc;
      }, {});
      setInventory(next);
      setSelected(current => current && next[current] ? current : null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the tai vi tri kho");
    }
  };

  useEffect(() => {
    void loadLocations();
  }, [branchId]);

  const openAdd = () => {
    setFormMode("add");
    setFormZone("A"); setFormShelf(1); setFormSlot(1);
    setFormItem(emptyItem);
    setShowForm(true);
  };

  const openEdit = (key: string) => {
    const [z, sh, sl] = key.split("-");
    setFormMode("edit");
    setFormKey(key);
    setFormZone(z); setFormShelf(+sh); setFormSlot(+sl);
    setFormItem({ ...inventory[key] });
    setShowForm(true);
  };

  const save = async () => {
    if (!formItem.name.trim()) return;
    const newKey = `${formZone}-${formShelf}-${formSlot}`;
    const request: WarehouseLocationRequest = {
      branchId: branchId || formItem.branchId || 1,
      zone: formZone,
      shelf: String(formShelf),
      slot: String(formSlot),
    };
    try {
      if (formMode === "edit" && formItem.locationId) {
        await api.put<WarehouseLocationDto>(`/admin/inventory/locations/${formItem.locationId}`, request);
      } else {
        await api.post<WarehouseLocationDto>("/admin/inventory/locations", request);
      }
      await loadLocations();
      setShowForm(false);
      setSelected(newKey);
      toast.success(formMode === "add" ? "Da them vi tri kho" : "Da cap nhat vi tri kho");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the luu vi tri kho");
    }
    return;

    setInventory(prev => {
      const next = { ...prev };
      if (formMode === "edit" && formKey !== newKey) delete next[formKey];
      next[newKey] = { ...formItem };
      return next;
    });
    setShowForm(false);
    setSelected(newKey);
  };

  const remove = async () => {
    if (!confirmDel) return;
    const item = inventory[confirmDel];
    try {
      if (item?.locationId) await api.del<void>(`/admin/inventory/locations/${item.locationId}`);
      setInventory(prev => { const n = { ...prev }; delete n[confirmDel]; return n; });
      if (selected === confirmDel) setSelected(null);
      setConfirmDel(null);
      toast.success("Da xoa vi tri kho");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Khong the xoa vi tri kho");
    }
    return;

    setInventory(prev => { const n = { ...prev }; delete n[confirmDel]; return n; });
    if (selected === confirmDel) setSelected(null);
    setConfirmDel(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F4761" }}>Vị trí sắp xếp kho</h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>Sơ đồ trực quan vị trí nguyên liệu trong kho</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0F4761] text-white rounded-lg hover:bg-[#0d3d54]"
            style={{ fontSize: "13.5px" }}
          >
            <Plus size={15} /> Thêm vị trí
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white rounded-lg hover:bg-gray-50"
            style={{ fontSize: "13.5px" }}
          >
            <Printer size={15} /> In sơ đồ kho
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Grid diagram */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "16px" }}>Sơ đồ kho</h3>
          <div className="space-y-6">
            {zones.map(zone => (
              <div key={zone}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0F4761] flex items-center justify-center text-white" style={{ fontSize: "14px", fontWeight: 700 }}>{zone}</div>
                  <span style={{ fontSize: "13.5px", fontWeight: 600, color: "#374151" }}>Khu {zone}</span>
                </div>
                <div className="space-y-2">
                  {shelves.map(shelf => (
                    <div key={shelf} className="flex items-center gap-2">
                      <span style={{ fontSize: "11.5px", color: "#9CA3AF", width: "40px" }}>Kệ {shelf}</span>
                      <div className="flex gap-2 flex-1">
                        {slots.map(slot => {
                          const key = `${zone}-${shelf}-${slot}`;
                          const item = inventory[key];
                          const isSelected = selected === key;
                          const isHovered = hoveredKey === key;
                          return (
                            <div
                              key={slot}
                              onClick={() => item && setSelected(isSelected ? null : key)}
                              onMouseEnter={() => setHoveredKey(key)}
                              onMouseLeave={() => setHoveredKey(null)}
                              className={`relative flex-1 h-14 rounded-xl border-2 transition-all flex flex-col items-center justify-center ${
                                item
                                  ? `cursor-pointer ${isSelected
                                      ? "bg-[#0F4761] border-[#0F4761] text-white"
                                      : "bg-blue-50 border-blue-200 hover:border-[#0F4761]"}`
                                  : "bg-gray-50 border-gray-200 cursor-default"
                              }`}
                            >
                              {item ? (
                                <>
                                  <span style={{ fontSize: "10px", fontWeight: 600, textAlign: "center", lineHeight: 1.2, color: isSelected ? "white" : "#374151" }}>
                                    {item.name.length > 8 ? item.name.slice(0, 8) + ".." : item.name}
                                  </span>
                                  <span style={{ fontSize: "10px", color: isSelected ? "rgba(255,255,255,0.7)" : "#9CA3AF" }}>{item.qty}{item.unit}</span>
                                </>
                              ) : (
                                <span style={{ fontSize: "10px", color: "#D1D5DB" }}>Ô {slot}</span>
                              )}
                              {isHovered && item && !isSelected && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#0F4761] rounded-full flex items-center justify-center">
                                  <Info size={9} className="text-white" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="w-72 space-y-4">
          {selectedData && selected ? (
            <div className="bg-white rounded-xl border border-[#0F4761] shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-[#0F4761]" />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#0F4761" }}>{selected}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(selected)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600" title="Sửa">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => setConfirmDel(selected)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Xóa">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  ["Nguyên liệu", selectedData.name],
                  ["Số lượng", `${selectedData.qty} ${selectedData.unit}`],
                  ["Ngày nhập", selectedData.added],
                  ["Hạn sử dụng", selectedData.expiry],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span style={{ fontSize: "12.5px", color: "#9CA3AF" }}>{k}</span>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col items-center justify-center h-48">
              <MapPin size={28} className="text-gray-300 mb-2" />
              <p style={{ fontSize: "13px", color: "#9CA3AF" }}>Click vào ô kho để xem chi tiết</p>
            </div>
          )}

          {/* Legend */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>Chú thích</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-5 rounded bg-blue-50 border-2 border-blue-200" />
                <span style={{ fontSize: "12px", color: "#6B7280" }}>Có nguyên liệu</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-5 rounded bg-gray-50 border-2 border-gray-200" />
                <span style={{ fontSize: "12px", color: "#6B7280" }}>Ô trống</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-5 rounded bg-[#0F4761] border-2 border-[#0F4761]" />
                <span style={{ fontSize: "12px", color: "#6B7280" }}>Đang chọn</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Text list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>Danh sách nguyên liệu theo vị trí</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {["Vị trí", "Nguyên liệu", "Số lượng", "Ngày nhập", "Hạn sử dụng", ""].map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {Object.entries(inventory).map(([key, item]) => (
              <tr key={key} className="hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-[#0F4761]" />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#0F4761" }}>
                      Khu {key.split("-")[0]} / Kệ {key.split("-")[1]} / Ô {key.split("-")[2]}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5" style={{ fontSize: "13.5px", color: "#1F2937", fontWeight: 500 }}>{item.name}</td>
                <td className="px-4 py-2.5" style={{ fontSize: "13px", color: "#374151" }}>{item.qty} {item.unit}</td>
                <td className="px-4 py-2.5" style={{ fontSize: "13px", color: "#6B7280" }}>{item.added}</td>
                <td className="px-4 py-2.5" style={{ fontSize: "13px", color: "#6B7280" }}>{item.expiry}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(key)} className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600" title="Sửa">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setConfirmDel(key)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500" title="Xóa">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>
                {formMode === "add" ? "Thêm vị trí kho" : "Sửa vị trí kho"}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label style={{ fontSize: "12.5px", color: "#374151", fontWeight: 500 }}>Vị trí (Khu / Kệ / Ô)</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <select
                    value={formZone}
                    onChange={e => setFormZone(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]"
                    style={{ fontSize: "13.5px" }}
                  >
                    {zones.map(z => <option key={z} value={z}>Khu {z}</option>)}
                  </select>
                  <select
                    value={formShelf}
                    onChange={e => setFormShelf(+e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]"
                    style={{ fontSize: "13.5px" }}
                  >
                    {shelves.map(s => <option key={s} value={s}>Kệ {s}</option>)}
                  </select>
                  <select
                    value={formSlot}
                    onChange={e => setFormSlot(+e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]"
                    style={{ fontSize: "13.5px" }}
                  >
                    {slots.map(s => <option key={s} value={s}>Ô {s}</option>)}
                  </select>
                </div>
                {formMode === "add" && inventory[`${formZone}-${formShelf}-${formSlot}`] && (
                  <p style={{ fontSize: "11.5px", color: "#EF4444", marginTop: "6px" }}>⚠ Vị trí này đã có nguyên liệu, sẽ bị ghi đè khi lưu.</p>
                )}
              </div>
              <div>
                <label style={{ fontSize: "12.5px", color: "#374151", fontWeight: 500 }}>Tên nguyên liệu *</label>
                <input
                  value={formItem.name}
                  onChange={e => setFormItem({ ...formItem, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]"
                  style={{ fontSize: "13.5px" }}
                  placeholder="Nhập tên nguyên liệu"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: "12.5px", color: "#374151", fontWeight: 500 }}>Số lượng</label>
                  <input
                    type="number"
                    value={formItem.qty}
                    onChange={e => setFormItem({ ...formItem, qty: +e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]"
                    style={{ fontSize: "13.5px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12.5px", color: "#374151", fontWeight: 500 }}>Đơn vị</label>
                  <select
                    value={formItem.unit}
                    onChange={e => setFormItem({ ...formItem, unit: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]"
                    style={{ fontSize: "13.5px" }}
                  >
                    {["kg", "lít", "lon", "gói", "cái", "thùng"].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: "12.5px", color: "#374151", fontWeight: 500 }}>Ngày nhập</label>
                  <input
                    value={formItem.added}
                    onChange={e => setFormItem({ ...formItem, added: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]"
                    style={{ fontSize: "13.5px" }}
                    placeholder="DD/MM/YYYY"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12.5px", color: "#374151", fontWeight: 500 }}>Hạn sử dụng</label>
                  <input
                    value={formItem.expiry}
                    onChange={e => setFormItem({ ...formItem, expiry: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0F4761]"
                    style={{ fontSize: "13.5px" }}
                    placeholder="DD/MM/YYYY hoặc —"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600" style={{ fontSize: "13.5px" }}>Hủy</button>
              <button onClick={save} className="px-4 py-2 bg-[#0F4761] text-white rounded-lg hover:bg-[#0d3d54]" style={{ fontSize: "13.5px" }}>
                {formMode === "add" ? "Thêm" : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDel(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#111827" }}>Xóa vị trí {confirmDel}?</h3>
            <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "8px" }}>
              Nguyên liệu "{inventory[confirmDel]?.name}" sẽ bị xóa khỏi vị trí này.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmDel(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600" style={{ fontSize: "13.5px" }}>Hủy</button>
              <button onClick={remove} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600" style={{ fontSize: "13.5px" }}>Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
