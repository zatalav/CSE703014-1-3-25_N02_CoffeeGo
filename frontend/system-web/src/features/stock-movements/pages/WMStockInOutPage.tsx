import { useEffect, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Bell, CheckCircle2, Download, History, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import type { RestockRequestDto, StockExportRequestDto, StockImportRequestDto } from "../../../lib/types";
import { loadInventoryData, type InventoryBranch, type InventoryData, type InventoryIngredient, type InventoryStockNote, type InventorySupplier } from "../../inventory-data";

const PRIMARY = "#1F4E3D";
const ACCENT = "#10B981";

type MainTab = "requests" | "import" | "export" | "history";

interface LineItem {
  ingredientId: number;
  name: string;
  unit: string;
  qty: number;
  price: number;
}

const emptyLine = (): LineItem => ({ ingredientId: 0, name: "", unit: "", qty: 1, price: 0 });
const localDateTimeNow = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 19);
};
const isActiveBranch = (branch: InventoryBranch) => !branch.status || branch.status.toLowerCase() === "active";
const isWarehouseBranch = (branch: InventoryBranch) => (branch.type || "").toLowerCase().includes("warehouse");

function ImportForm({
  ingredients,
  suppliers,
  branchId,
  employeeId,
  notes,
  onSaved,
}: {
  ingredients: InventoryIngredient[];
  suppliers: InventorySupplier[];
  branchId: number;
  employeeId: number;
  notes: InventoryStockNote[];
  onSaved: () => Promise<void>;
}) {
  const [supplierId, setSupplierId] = useState(0);
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const updateLine = (i: number, field: keyof LineItem, value: string | number) => {
    setLines(prev => prev.map((line, idx) => {
      if (idx !== i) return line;
      if (field === "ingredientId") {
        const ing = ingredients.find(item => item.id === Number(value));
        return ing ? { ...line, ingredientId: ing.id, name: ing.name, unit: ing.unit, price: ing.price } : { ...line, ingredientId: 0, name: "", unit: "", price: 0 };
      }
      return { ...line, [field]: (field === "qty" || field === "price") ? Number(value) : value };
    }));
  };

  const total = lines.reduce((sum, line) => sum + line.qty * line.price, 0);

  const handleSave = async () => {
    if (!branchId || !employeeId) {
      setMessage("Khong xac dinh duoc kho hoac nguoi tao phieu. Vui long dang nhap lai.");
      return;
    }

    const detailRows = lines
      .filter(line => line.ingredientId && line.qty > 0)
      .map(line => ({
        ingredientId: line.ingredientId,
        quantity: line.qty,
        unit: line.unit,
        unitPrice: Math.round(line.price),
      }));

    if (!supplierId || detailRows.length === 0 || total <= 0) {
      setMessage("Chọn nhà cung cấp và ít nhất một dòng nguyên liệu có giá trị.");
      return;
    }

    const payload: StockImportRequestDto = {
      branchId,
      supplierId,
      employeeId,
      totalAmount: Math.round(total),
      note: note.trim() || null,
      importedAt: localDateTimeNow(),
      details: detailRows,
    };

    try {
      setSaving(true);
      setMessage("");
      await api.post("/admin/inventory/stock-imports", payload);
      setLines([emptyLine()]);
      setNote("");
      setSupplierId(0);
      await onSaved();
      window.dispatchEvent(new Event("coffee.inventory.changed"));
      setMessage("Đã lưu phiếu nhập vào database.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không lưu được phiếu nhập.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><ArrowUpCircle size={18} style={{ color: ACCENT }} /> Phiếu nhập kho mới</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Nhà cung cấp *</label>
            <select value={supplierId} onChange={e => setSupplierId(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={{ borderColor: "#E5E7EB" }}>
              <option value={0}>-- Chọn NCC --</option>
              {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Ngày nhập</label>
            <input type="text" value={new Date().toLocaleDateString("vi-VN")} readOnly className="w-full px-3 py-2 rounded-xl border text-sm bg-gray-50" style={{ borderColor: "#E5E7EB" }} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Ghi chú</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Nhập định kỳ, khuyến mãi NCC..." className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={{ borderColor: "#E5E7EB" }} />
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden mb-4" style={{ borderColor: "#E5E7EB" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB" }}>
                {["#", "Nguyên liệu", "ĐVT", "SL", "Đơn giá", "Thành tiền", ""].map(header => <th key={header} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="border-t" style={{ borderColor: "#F3F4F6" }}>
                  <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2">
                    <select value={line.ingredientId} onChange={e => updateLine(i, "ingredientId", e.target.value)} className="w-full px-2 py-1 rounded-lg border text-xs focus:outline-none" style={{ borderColor: "#E5E7EB" }}>
                      <option value={0}>-- Chọn --</option>
                      {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">{line.unit || "-"}</td>
                  <td className="px-3 py-2"><input type="number" min={0} value={line.qty} onChange={e => updateLine(i, "qty", e.target.value)} className="w-full px-2 py-1 rounded-lg border text-xs text-center focus:outline-none" style={{ borderColor: "#E5E7EB" }} /></td>
                  <td className="px-3 py-2"><input type="number" min={0} value={line.price} onChange={e => updateLine(i, "price", e.target.value)} className="w-full px-2 py-1 rounded-lg border text-xs text-right focus:outline-none" style={{ borderColor: "#E5E7EB" }} /></td>
                  <td className="px-3 py-2 text-right text-xs font-semibold text-gray-800">{new Intl.NumberFormat("vi-VN").format(line.qty * line.price)}đ</td>
                  <td className="px-3 py-2"><button onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t" style={{ borderColor: "#E5E7EB" }}>
                <td colSpan={5} className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700">Tổng cộng:</td>
                <td className="px-3 py-2.5 text-right text-sm font-bold" style={{ color: PRIMARY }}>{new Intl.NumberFormat("vi-VN").format(total)}đ</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {message && <p className="mb-3 text-xs" style={{ color: message.startsWith("Đã") ? "#059669" : "#DC2626" }}>{message}</p>}
        <div className="flex items-center gap-3">
          <button onClick={() => setLines(prev => [...prev, emptyLine()])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border" style={{ borderColor: "#D1FAE5", color: ACCENT, backgroundColor: "#F0FDF4" }}><Plus size={13} /> Thêm dòng</button>
          <div className="flex-1" />
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: ACCENT }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpCircle size={16} />}
            Lưu phiếu nhập
          </button>
        </div>
      </div>

      <RecentNotes title="Phiếu nhập gần đây" notes={notes.filter(noteItem => noteItem.type === "import")} color={ACCENT} />
    </div>
  );
}

function ExportForm({
  ingredients,
  branches,
  sourceBranchId,
  employeeId,
  notes,
  onSaved,
}: {
  ingredients: InventoryIngredient[];
  branches: InventoryBranch[];
  sourceBranchId: number;
  employeeId: number;
  notes: InventoryStockNote[];
  onSaved: () => Promise<void>;
}) {
  const [toBranchId, setToBranchId] = useState(0);
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const targetBranches = branches.filter(branch => branch.id !== sourceBranchId && isActiveBranch(branch) && !isWarehouseBranch(branch));

  const updateLine = (i: number, field: keyof LineItem, value: string | number) => {
    setLines(prev => prev.map((line, idx) => {
      if (idx !== i) return line;
      if (field === "ingredientId") {
        const ing = ingredients.find(item => item.id === Number(value));
        return ing ? { ...line, ingredientId: ing.id, name: ing.name, unit: ing.unit, price: ing.price } : { ...line, ingredientId: 0, name: "", unit: "", price: 0 };
      }
      return { ...line, [field]: (field === "qty" || field === "price") ? Number(value) : value };
    }));
  };

  const total = lines.reduce((sum, line) => sum + line.qty * line.price, 0);

  const handleSave = async () => {
    if (!sourceBranchId || !employeeId) {
      setMessage("Khong xac dinh duoc kho nguon hoac nguoi tao phieu. Vui long dang nhap lai.");
      return;
    }

    if (targetBranches.length === 0) {
      setMessage("Can tao them chi nhanh ban hang dang hoat dong truoc khi lap phieu xuat.");
      return;
    }

    const detailRows = lines
      .filter(line => line.ingredientId && line.qty > 0)
      .map(line => ({
        ingredientId: line.ingredientId,
        quantity: line.qty,
        unit: line.unit,
        unitPrice: Math.round(line.price),
      }));

    if (!toBranchId || detailRows.length === 0 || total <= 0) {
      setMessage("Chọn chi nhánh nhận và ít nhất một dòng nguyên liệu có giá trị.");
      return;
    }

    const requiredByIngredient = new Map<number, number>();
    detailRows.forEach(row => {
      requiredByIngredient.set(row.ingredientId, (requiredByIngredient.get(row.ingredientId) || 0) + row.quantity);
    });
    const overStock = Array.from(requiredByIngredient).some(([ingredientId, quantity]) => {
      const ingredient = ingredients.find(item => item.id === ingredientId);
      return !ingredient || quantity > ingredient.current;
    });
    if (overStock) {
      setMessage("So luong xuat vuot ton kho hien co.");
      return;
    }

    const payload: StockExportRequestDto = {
      fromBranchId: sourceBranchId,
      toBranchId,
      employeeId,
      note: reason.trim() || null,
      totalAmount: Math.round(total),
      exportedAt: localDateTimeNow(),
      details: detailRows,
    };

    try {
      setSaving(true);
      setMessage("");
      await api.post("/admin/inventory/stock-exports", payload);
      setLines([emptyLine()]);
      setReason("");
      setToBranchId(0);
      await onSaved();
      window.dispatchEvent(new Event("coffee.inventory.changed"));
      setMessage("Đã lưu phiếu xuất vào database.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không lưu được phiếu xuất.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><ArrowDownCircle size={18} style={{ color: "#7C3AED" }} /> Phiếu xuất kho mới</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Xuất cho chi nhánh *</label>
            <select value={toBranchId} onChange={e => setToBranchId(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={{ borderColor: "#E5E7EB" }}>
              <option value={0}>-- Chọn chi nhánh --</option>
              {targetBranches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            {targetBranches.length === 0 && <p className="text-xs text-red-500 mt-1">Can tao them chi nhanh ban hang dang hoat dong.</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Ngày xuất</label>
            <input type="text" value={new Date().toLocaleDateString("vi-VN")} readOnly className="w-full px-3 py-2 rounded-xl border text-sm bg-gray-50" style={{ borderColor: "#E5E7EB" }} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Lý do xuất kho</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Cung ứng thường kỳ, đơn đặc biệt..." className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={{ borderColor: "#E5E7EB" }} />
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden mb-4" style={{ borderColor: "#E5E7EB" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB" }}>
                {["#", "Nguyên liệu", "ĐVT", "Tồn kho", "SL xuất", "Thành tiền", ""].map(header => <th key={header} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const ing = ingredients.find(item => item.id === line.ingredientId);
                const overStock = !!ing && line.qty > ing.current;
                return (
                  <tr key={i} className="border-t" style={{ borderColor: "#F3F4F6" }}>
                    <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2">
                      <select value={line.ingredientId} onChange={e => updateLine(i, "ingredientId", e.target.value)} className="w-full px-2 py-1 rounded-lg border text-xs focus:outline-none" style={{ borderColor: "#E5E7EB" }}>
                        <option value={0}>-- Chọn --</option>
                        {ingredients.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{line.unit || "-"}</td>
                    <td className="px-3 py-2 text-xs font-medium" style={{ color: ing ? (ing.current <= ing.minLevel ? "#DC2626" : "#059669") : "#9CA3AF" }}>{ing ? `${ing.current} ${ing.unit}` : "-"}</td>
                    <td className="px-3 py-2">
                      <input type="number" min={0} value={line.qty} onChange={e => updateLine(i, "qty", e.target.value)} className="w-full px-2 py-1 rounded-lg border text-xs text-center focus:outline-none" style={{ borderColor: overStock ? "#FCA5A5" : "#E5E7EB", backgroundColor: overStock ? "#FEF2F2" : "transparent" }} />
                      {overStock && <p className="text-xs text-red-500 mt-0.5">Vượt tồn</p>}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-semibold text-gray-800">{new Intl.NumberFormat("vi-VN").format(line.qty * line.price)}đ</td>
                    <td className="px-3 py-2"><button onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={13} /></button></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t" style={{ borderColor: "#E5E7EB" }}>
                <td colSpan={5} className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700">Tổng cộng:</td>
                <td className="px-3 py-2.5 text-right text-sm font-bold" style={{ color: "#7C3AED" }}>{new Intl.NumberFormat("vi-VN").format(total)}đ</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {message && <p className="mb-3 text-xs" style={{ color: message.startsWith("Đã") ? "#059669" : "#DC2626" }}>{message}</p>}
        <div className="flex items-center gap-3">
          <button onClick={() => setLines(prev => [...prev, emptyLine()])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border" style={{ borderColor: "#EDE9FE", color: "#7C3AED", backgroundColor: "#F5F3FF" }}><Plus size={13} /> Thêm dòng</button>
          <div className="flex-1" />
          <button onClick={handleSave} disabled={saving || targetBranches.length === 0} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: "#7C3AED" }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownCircle size={16} />}
            Lưu phiếu xuất
          </button>
        </div>
      </div>

      <RecentNotes title="Phiếu xuất gần đây" notes={notes.filter(noteItem => noteItem.type === "export")} color="#7C3AED" />
    </div>
  );
}

function RecentNotes({ title, notes, color }: { title: string; notes: InventoryStockNote[]; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="space-y-2">
        {notes.slice(0, 8).map(note => (
          <div key={`${note.type}-${note.numericId}`} className="p-3 rounded-xl border" style={{ borderColor: "#E5E7EB" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color }}>{note.id}</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#ECFDF5", color: "#059669" }}>Xác nhận</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{note.type === "import" ? note.supplier : note.branch}</p>
            {note.items.length > 0 && (
              <div className="mt-2 space-y-1">
                {note.items.slice(0, 2).map((item, index) => (
                  <p key={`${note.type}-${note.numericId}-${item.ingredientId}-${index}`} className="text-xs text-gray-600 truncate">
                    {item.name}: <strong>{item.qty} {item.unit}</strong>
                  </p>
                ))}
                {note.items.length > 2 && <p className="text-xs text-gray-400">+{note.items.length - 2} mat hang khac</p>}
              </div>
            )}
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-gray-400">{note.date}</span>
              <span className="text-xs font-bold text-gray-800">{new Intl.NumberFormat("vi-VN").format(note.total)}đ</span>
            </div>
          </div>
        ))}
        {notes.length === 0 && <p className="py-8 text-center text-sm text-gray-400">Chưa có dữ liệu trong database</p>}
      </div>
    </div>
  );
}

function RestockRequestsTab({
  requests,
  branches,
  ingredients,
  onSaved,
}: {
  requests: RestockRequestDto[];
  branches: InventoryBranch[];
  ingredients: InventoryIngredient[];
  onSaved: () => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const branchName = (branchId?: number | null) =>
    branches.find(branch => branch.id === branchId)?.name || (branchId ? `Chi nhánh #${branchId}` : "-");
  const ingredientName = (ingredientId?: number | null) =>
    ingredients.find(item => item.id === ingredientId)?.name || (ingredientId ? `NL-${ingredientId}` : "-");
  const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString("vi-VN") : "";

  const updateStatus = async (requestId: number, status: "processing" | "fulfilled" | "cancelled") => {
    try {
      setBusyId(requestId);
      setMessage("");
      await api.patch(`/admin/inventory/restock-requests/${requestId}/status`, { status });
      await onSaved();
      window.dispatchEvent(new Event("coffee.inventory.changed"));
      setMessage("Đã cập nhật trạng thái yêu cầu.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không cập nhật được yêu cầu nhập hàng.");
    } finally {
      setBusyId(null);
    }
  };

  const sorted = [...requests].sort((a, b) => {
    const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return right - left;
  });
  const pendingCount = sorted.filter(item => (item.status || "pending").toLowerCase() === "pending").length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Bell size={17} style={{ color: "#F59E0B" }} /> Yêu cầu nhập hàng từ chi nhánh</h3>
          <p className="text-xs text-gray-500 mt-1">{pendingCount} yêu cầu mới đang chờ quản lý kho xử lý</p>
        </div>
        <button onClick={() => void onSaved()} className="px-3 py-2 rounded-xl text-sm border font-medium" style={{ borderColor: "#D1FAE5", color: ACCENT, backgroundColor: "#F0FDF4" }}>Làm mới</button>
      </div>
      {message && <p className="px-4 py-2 text-xs" style={{ color: message.startsWith("Đã") ? "#059669" : "#DC2626" }}>{message}</p>}
      <div className="divide-y divide-gray-100">
        {sorted.map(request => {
          const status = (request.status || "pending").toLowerCase();
          const statusLabel = status === "fulfilled" ? "Đã xử lý" : status === "processing" ? "Đang xử lý" : status === "cancelled" ? "Đã hủy" : "Mới";
          const statusColor = status === "fulfilled" ? "#059669" : status === "processing" ? "#2563EB" : status === "cancelled" ? "#DC2626" : "#D97706";
          return (
            <div key={request.requestId} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: PRIMARY }}>YC-{request.requestId}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${statusColor}18`, color: statusColor }}>{statusLabel}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{branchName(request.branchId)} · NV #{request.employeeId || "-"} · {formatDateTime(request.createdAt)}</p>
                  {request.note && <p className="text-xs text-gray-600 mt-1">{request.note}</p>}
                </div>
                <div className="flex gap-2">
                  {status === "pending" && (
                    <button onClick={() => void updateStatus(request.requestId, "processing")} disabled={busyId === request.requestId} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60" style={{ backgroundColor: "#2563EB" }}>Nhận xử lý</button>
                  )}
                  {status !== "fulfilled" && status !== "cancelled" && (
                    <button onClick={() => void updateStatus(request.requestId, "fulfilled")} disabled={busyId === request.requestId} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60" style={{ backgroundColor: ACCENT }}>Hoàn tất</button>
                  )}
                </div>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: "#F9FAFB" }}>
                      {["Nguyên liệu", "SL yêu cầu", "Tồn hiện tại", "Tồn tối thiểu"].map(header => <th key={header} className="px-3 py-2 text-left font-semibold text-gray-500">{header}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(request.items || []).map(item => (
                      <tr key={item.requestDetailId} className="border-t" style={{ borderColor: "#F3F4F6" }}>
                        <td className="px-3 py-2 font-medium text-gray-700">{ingredientName(item.ingredientId)}</td>
                        <td className="px-3 py-2 text-gray-600">{item.quantity || 0} {item.unit || ""}</td>
                        <td className="px-3 py-2 text-gray-500">{item.currentQuantity ?? "-"} {item.unit || ""}</td>
                        <td className="px-3 py-2 text-gray-500">{item.minQuantity ?? "-"} {item.unit || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && <p className="py-12 text-center text-sm text-gray-400">Chưa có yêu cầu nhập hàng từ chi nhánh</p>}
      </div>
    </div>
  );
}

function HistoryTab({ notes }: { notes: InventoryStockNote[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "import" | "export">("all");

  const filtered = useMemo(() => notes.filter(note => {
    const keyword = search.trim().toLowerCase();
    const matchType = typeFilter === "all" || note.type === typeFilter;
    const matchSearch = !keyword
      || note.id.toLowerCase().includes(keyword)
      || (note.supplier || "").toLowerCase().includes(keyword)
      || note.branch.toLowerCase().includes(keyword)
      || note.items.some(item => item.name.toLowerCase().includes(keyword));
    return matchType && matchSearch;
  }), [notes, search, typeFilter]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm phiếu, NCC, chi nhánh..." className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm focus:outline-none" style={{ borderColor: "#E5E7EB" }} />
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: "#F3F4F6" }}>
          {(["all", "import", "export"] as const).map(type => (
            <button key={type} onClick={() => setTypeFilter(type)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: typeFilter === type ? "#fff" : "transparent", color: typeFilter === type ? "#111827" : "#9CA3AF", boxShadow: typeFilter === type ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
              {type === "all" ? "Tất cả" : type === "import" ? "Nhập kho" : "Xuất kho"}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border font-medium" style={{ borderColor: "#D1FAE5", color: ACCENT, backgroundColor: "#F0FDF4" }}><Download size={14} /> Xuất Excel</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "#F9FAFB" }}>
              {["Mã phiếu", "Loại", "Đối tác", "Ngày", "Mặt hàng", "Tổng tiền", "Trạng thái", "Người tạo"].map(header => <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(note => (
              <tr key={`${note.type}-${note.numericId}`} className="border-t" style={{ borderColor: "#F3F4F6" }}>
                <td className="px-4 py-3 text-xs font-semibold" style={{ color: PRIMARY }}>{note.id}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: note.type === "import" ? "#ECFDF5" : "#F5F3FF", color: note.type === "import" ? "#059669" : "#7C3AED" }}>
                    {note.type === "import" ? <ArrowUpCircle size={11} /> : <ArrowDownCircle size={11} />}
                    {note.type === "import" ? "Nhập" : "Xuất"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-700">{note.type === "import" ? note.supplier : note.branch}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{note.date}</td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {note.items.length > 0 ? (
                    <div className="space-y-1">
                      {note.items.map((item, index) => (
                        <div key={`${note.type}-${note.numericId}-${item.ingredientId}-${index}`}>
                          <span className="font-medium text-gray-800">{item.name}</span>
                          <span className="text-gray-400"> - {item.qty} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                  ) : "-"}
                </td>
                <td className="px-4 py-3 text-right text-xs font-bold text-gray-800">{new Intl.NumberFormat("vi-VN").format(note.total)}đ</td>
                <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#ECFDF5", color: "#059669" }}>Đã xác nhận</span></td>
                <td className="px-4 py-3 text-xs text-gray-500">{note.createdBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-12 text-center text-gray-400 text-sm">Không có phiếu trong database</div>}
      </div>
    </div>
  );
}

export function WMStockInOutPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<MainTab>("requests");
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      setData(await loadInventoryData(session?.userInfo?.branchId ?? null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu nhập/xuất kho.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [session?.userInfo?.branchId]);

  const sourceBranchId = useMemo(() => {
    const sessionBranch = data?.branches.find(branch => branch.id === session?.userInfo?.branchId);
    return sessionBranch?.id || session?.userInfo?.branchId || data?.branches[0]?.id || 0;
  }, [data?.branches, session?.userInfo?.branchId]);
  const employeeId = session?.userInfo?.id || 0;
  const pendingRequestCount = (data?.restockRequests || []).filter(item => (item.status || "pending").toLowerCase() === "pending").length;

  const tabs = [
    { id: "requests" as MainTab, label: `Yêu cầu${pendingRequestCount > 0 ? ` (${pendingRequestCount})` : ""}`, icon: <Bell size={15} style={{ color: tab === "requests" ? "#F59E0B" : "#9CA3AF" }} /> },
    { id: "import" as MainTab, label: "Nhập kho", icon: <ArrowUpCircle size={15} style={{ color: tab === "import" ? ACCENT : "#9CA3AF" }} /> },
    { id: "export" as MainTab, label: "Xuất kho", icon: <ArrowDownCircle size={15} style={{ color: tab === "export" ? "#7C3AED" : "#9CA3AF" }} /> },
    { id: "history" as MainTab, label: "Lịch sử phiếu", icon: <History size={15} style={{ color: tab === "history" ? PRIMARY : "#9CA3AF" }} /> },
  ];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="font-bold text-gray-900" style={{ fontSize: 20 }}>Nhập / Xuất kho</h2>
        <p className="text-sm text-gray-500 mt-0.5">Phiếu nhập/xuất được lưu vào database qua inventory-service</p>
      </div>
      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ backgroundColor: "#F3F4F6" }}>
        {tabs.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all" style={{ backgroundColor: tab === item.id ? "#fff" : "transparent", color: tab === item.id ? "#111827" : "#9CA3AF", boxShadow: tab === item.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {loading && <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400 border border-gray-100">Đang tải dữ liệu...</div>}
      {!loading && data && tab === "requests" && <RestockRequestsTab requests={data.restockRequests} branches={data.branches} ingredients={data.ingredients} onSaved={loadData} />}
      {!loading && data && tab === "import" && <ImportForm ingredients={data.ingredients} suppliers={data.suppliers} branchId={sourceBranchId} employeeId={employeeId} notes={data.stockNotes} onSaved={loadData} />}
      {!loading && data && tab === "export" && <ExportForm ingredients={data.ingredients} branches={data.branches} sourceBranchId={sourceBranchId} employeeId={employeeId} notes={data.stockNotes} onSaved={loadData} />}
      {!loading && data && tab === "history" && <HistoryTab notes={data.stockNotes} />}
      {!loading && !data && <div className="bg-white rounded-2xl p-8 text-center text-sm text-gray-400 border border-gray-100">Không có dữ liệu từ database</div>}
    </div>
  );
}
