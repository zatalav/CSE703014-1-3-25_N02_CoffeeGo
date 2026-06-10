import { useEffect, useMemo, useState } from "react";
import { Search, Eye, RotateCcw, Download } from "lucide-react";
import { api } from "../../../lib/api";
import { ADMIN_PAGE_SIZE, Pagination, getPageCount, getPagedItems } from "../../../shared/components/Pagination";
import { isDateInRange, rangeForPeriod, rollingReportPeriods, type ReportPeriod } from "../../../shared/utils/reportPeriods";
import type { BranchDto, PageResponse } from "../../../lib/types";

type OrderStatus = "new" | "preparing" | "delivering" | "completed" | "cancelled";

type OrderItemDto = {
  name?: string | null;
  qty?: number | null;
  quantity?: number | null;
};

type OrderDto = {
  id?: string;
  orderId: number;
  orderNumber?: string | null;
  customerId?: number | null;
  employeeId?: number | null;
  branchId?: number | null;
  orderType?: string | null;
  status?: string | null;
  note?: string | null;
  createdAt?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  total?: number | null;
  amount?: number | null;
  items?: OrderItemDto[];
};

type Order = {
  id: string;
  customer: string;
  phone: string;
  branch: string;
  items: string;
  total: number;
  time: string;
  createdAt: string | null;
  status: OrderStatus;
  channel: string;
  rawStatus: string;
};

const statusConfig: Record<OrderStatus, { label: string; bg: string; color: string }> = {
  new: { label: "Mới", bg: "bg-blue-100", color: "text-blue-700" },
  preparing: { label: "Đang xử lý", bg: "bg-yellow-100", color: "text-yellow-700" },
  delivering: { label: "Đang giao", bg: "bg-orange-100", color: "text-orange-700" },
  completed: { label: "Hoàn thành", bg: "bg-green-100", color: "text-green-700" },
  cancelled: { label: "Đã hủy", bg: "bg-red-100", color: "text-red-700" },
};

const pageItems = <T,>(payload: PageResponse<T> | T[] | null | undefined): T[] => {
  if (!payload) return [];
  return Array.isArray(payload) ? payload : payload.items || [];
};

const INITIAL_ORDER_PAGE_COUNT = 3;
const BACKGROUND_ORDER_PAGE_BATCH = 3;

const normalizeStatus = (value?: string | null): OrderStatus => {
  const status = (value || "pending").trim().toLowerCase();
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  if (status === "delivering") return "delivering";
  if (status === "confirmed" || status === "preparing" || status === "ready") return "preparing";
  return "new";
};

const formatCurrency = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

const formatDateTime = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const noteValue = (note: string | null | undefined, labels: string[]) => {
  if (!note) return "";
  const lines = note.split(/\r?\n/);
  for (const label of labels) {
    const prefix = `${label.toLowerCase()}:`;
    const line = lines.find(item => item.trim().toLowerCase().startsWith(prefix));
    if (line) return line.slice(line.indexOf(":") + 1).trim();
  }
  return "";
};

const orderTypeLabel = (value?: string | null) => {
  const type = (value || "").toLowerCase();
  if (type === "delivery") return "Online";
  if (type === "dine-in") return "Tại quầy";
  if (type === "takeaway") return "Mang đi";
  return value || "Tại quầy";
};

const mapOrder = (order: OrderDto, branchNames: Map<number, string>): Order => {
  const id = order.orderNumber || order.id || String(order.orderId);
  const noteName = noteValue(order.note, ["Khach hang", "Khách hàng"]);
  const notePhone = noteValue(order.note, ["So dien thoai", "Số điện thoại"]);
  const items = (order.items || [])
    .map(item => {
      const quantity = item.quantity ?? item.qty ?? 0;
      return `${item.name || "Sản phẩm"} x${quantity}`;
    })
    .join(", ");

  return {
    id,
    customer: order.customerName?.trim() || noteName || (order.customerId ? `Khách #${order.customerId}` : "Khách lẻ"),
    phone: order.customerPhone?.trim() || notePhone || "-",
    branch: order.branchId ? branchNames.get(order.branchId) || `Chi nhánh #${order.branchId}` : "-",
    items: items || "Chưa có chi tiết sản phẩm",
    total: Number(order.amount ?? order.total ?? 0),
    time: formatDateTime(order.createdAt),
    createdAt: order.createdAt || null,
    status: normalizeStatus(order.status),
    channel: orderTypeLabel(order.orderType),
    rawStatus: order.status || "pending",
  };
};

const loadOrderPage = async (pageIndex: number): Promise<PageResponse<OrderDto>> => {
  const payload = await api.get<PageResponse<OrderDto> | OrderDto[]>(
    `/orders?page=${pageIndex}&size=${ADMIN_PAGE_SIZE}`,
  );

  if (Array.isArray(payload)) {
    return {
      items: payload,
      page: pageIndex,
      size: ADMIN_PAGE_SIZE,
      totalElements: payload.length,
      totalPages: pageIndex + 1,
    };
  }

  return payload;
};

const mergeUniqueOrders = (current: Order[], next: Order[]) => {
  const byId = new Map<string, Order>();
  current.forEach(order => byId.set(order.id, order));
  next.forEach(order => byId.set(order.id, order));
  return Array.from(byId.values());
};

export function Orders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<ReportPeriod>("week");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedPages, setLoadedPages] = useState(0);
  const [totalOrderPages, setTotalOrderPages] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      try {
        setLoading(true);
        setLoadingMore(false);
        setLoadedPages(0);
        setTotalOrderPages(0);
        setError("");
        const branchPayload = await api.get<PageResponse<BranchDto> | BranchDto[]>("/branches?size=500&sort=branchId,asc");
        if (!mounted) return;
        const branchNames = new Map(pageItems(branchPayload).map(branch => [branch.branchId, branch.branchName || `Chi nhánh #${branch.branchId}`]));

        const firstPage = await loadOrderPage(0);
        if (!mounted) return;

        let discoveredTotalPages = Math.max(1, firstPage.totalPages || 1);
        const initialPageCount = Math.min(INITIAL_ORDER_PAGE_COUNT, discoveredTotalPages);
        const initialIndexes = Array.from({ length: Math.max(0, initialPageCount - 1) }, (_, index) => index + 1);
        const initialRest = await Promise.all(initialIndexes.map(index => loadOrderPage(index)));
        const initialPages = [firstPage, ...initialRest];
        discoveredTotalPages = Math.max(discoveredTotalPages, ...initialPages.map(page => page.totalPages || 1));
        if (!mounted) return;

        setOrders(initialPages.flatMap(page => pageItems(page)).map(order => mapOrder(order, branchNames)));
        setLoadedPages(initialPages.length);
        setTotalOrderPages(discoveredTotalPages);
        setLoading(false);

        if (discoveredTotalPages > initialPages.length) {
          setLoadingMore(true);
          for (let start = initialPages.length; mounted && start < discoveredTotalPages; start += BACKGROUND_ORDER_PAGE_BATCH) {
            const indexes = Array.from(
              { length: Math.min(BACKGROUND_ORDER_PAGE_BATCH, discoveredTotalPages - start) },
              (_, index) => start + index,
            );
            const pages = await Promise.all(indexes.map(index => loadOrderPage(index).catch(() => null)));
            const loaded = pages.filter((page): page is PageResponse<OrderDto> => Boolean(page));
            if (!mounted) return;
            if (!loaded.length) continue;

            discoveredTotalPages = Math.max(discoveredTotalPages, ...loaded.map(page => page.totalPages || discoveredTotalPages));
            setOrders(current => mergeUniqueOrders(
              current,
              loaded.flatMap(page => pageItems(page)).map(order => mapOrder(order, branchNames)),
            ));
            setLoadedPages(prev => Math.max(prev, ...loaded.map(page => page.page + 1)));
            setTotalOrderPages(discoveredTotalPages);
          }
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Không tải được đơn hàng từ CSDL.");
        setOrders([]);
        setLoadedPages(0);
        setTotalOrderPages(0);
      } finally {
        if (mounted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    }

    void loadOrders();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedRange = useMemo(() => rangeForPeriod(periodFilter), [periodFilter]);
  const periodOrders = useMemo(
    () => orders.filter(o => isDateInRange(o.createdAt, selectedRange)),
    [orders, selectedRange],
  );

  const filtered = useMemo(() => periodOrders.filter(o => {
    const keyword = search.trim().toLowerCase();
    const matchSearch = !keyword
      || o.id.toLowerCase().includes(keyword)
      || o.customer.toLowerCase().includes(keyword)
      || o.phone.toLowerCase().includes(keyword);
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchBranch = branchFilter === "all" || o.branch === branchFilter;
    return matchSearch && matchStatus && matchBranch;
  }), [branchFilter, periodOrders, search, statusFilter]);
  const pagedOrders = useMemo(() => getPagedItems(filtered, page), [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [branchFilter, periodFilter, search, statusFilter]);

  useEffect(() => {
    setPage(prev => Math.min(prev, getPageCount(filtered.length)));
  }, [filtered.length]);

  const branches = useMemo(() => Array.from(new Set(orders.map(o => o.branch))).filter(Boolean), [orders]);

  const counts = {
    new: periodOrders.filter(o => o.status === "new").length,
    preparing: periodOrders.filter(o => o.status === "preparing").length,
    delivering: periodOrders.filter(o => o.status === "delivering").length,
    completed: periodOrders.filter(o => o.status === "completed").length,
    cancelled: periodOrders.filter(o => o.status === "cancelled").length,
  };
  const orderLoadStatus = loadingMore && totalOrderPages > loadedPages ? (
    <span style={{ fontSize: "12.5px", color: "#9CA3AF" }}>
      Đang tải thêm {loadedPages}/{totalOrderPages} trang
    </span>
  ) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F4761" }}>Quản lý đơn hàng</h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>Theo dõi và quản lý tất cả đơn hàng</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg" style={{ fontSize: "13px" }}>
          <Download size={14} /> Xuất Excel
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-5 gap-3">
        {Object.entries(statusConfig).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setStatusFilter(statusFilter === k ? "all" : k as OrderStatus)}
            className={`rounded-xl p-4 border shadow-sm text-left transition-all ${statusFilter === k ? `${v.bg} border-current` : "bg-white border-gray-100 hover:bg-gray-50"}`}
          >
            <div style={{ fontSize: "12px", color: "#6B7280" }}>{v.label}</div>
            <div style={{ fontSize: "28px", fontWeight: 800 }} className={v.color}>{counts[k as OrderStatus]}</div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm mã đơn, tên khách, số điện thoại..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg outline-none"
            style={{ fontSize: "13px" }}
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as OrderStatus | "all")} className="px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }}>
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }}>
          <option value="all">Tất cả chi nhánh</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value as ReportPeriod)} className="px-3 py-2 border border-gray-200 rounded-lg outline-none" style={{ fontSize: "13px" }}>
          {rollingReportPeriods.map(period => (
            <option key={period.id} value={period.id}>{period.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {["Mã đơn", "Khách hàng", "Chi nhánh", "Món", "Kênh", "Tổng tiền", "Thời gian", "Trạng thái", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left" style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center" style={{ fontSize: "13px", color: "#9CA3AF" }}>Đang tải dữ liệu...</td>
              </tr>
            )}
            {!loading && pagedOrders.map(o => {
              const sc = statusConfig[o.status];
              return (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#0F4761" }}>#{o.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div style={{ fontSize: "13.5px", fontWeight: 500, color: "#1F2937" }}>{o.customer}</div>
                    <div style={{ fontSize: "11.5px", color: "#9CA3AF" }}>{o.phone}</div>
                  </td>
                  <td className="px-4 py-3" style={{ fontSize: "13px", color: "#374151" }}>{o.branch}</td>
                  <td className="px-4 py-3" style={{ fontSize: "12.5px", color: "#6B7280", maxWidth: "180px" }}>
                    <span className="line-clamp-1">{o.items}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${o.channel === "Online" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>{o.channel}</span>
                  </td>
                  <td className="px-4 py-3" style={{ fontSize: "13px", fontWeight: 700, color: "#0F4761" }}>
                    {formatCurrency(o.total)}
                  </td>
                  <td className="px-4 py-3" style={{ fontSize: "12px", color: "#9CA3AF", whiteSpace: "nowrap" }}>{o.time}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelected(o)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-500" title="Xem">
                        <Eye size={15} />
                      </button>
                      {(o.status === "new" || o.status === "preparing") && (
                        <button className="p-1.5 hover:bg-orange-50 rounded-lg text-gray-400 hover:text-orange-500" title="Hoàn tác">
                          <RotateCcw size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center" style={{ fontSize: "13px", color: "#9CA3AF" }}>Không tìm thấy đơn hàng phù hợp</td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination page={page} total={filtered.length} onPageChange={setPage} itemLabel="don hang" extraContent={orderLoadStatus} />
        <div className="hidden">
          <span style={{ fontSize: "12.5px", color: "#9CA3AF" }}>Hiển thị {filtered.length} / {orders.length} đơn hàng</span>
          <div className="flex gap-1">
            {[1, 2, 3].map(p => (
              <button key={p} className={`w-8 h-8 rounded-lg text-xs ${p === 1 ? "bg-[#0F4761] text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-50"}`}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>Chi tiết đơn #{selected.id}</h2>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">x</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["Khách hàng", selected.customer],
                  ["Số điện thoại", selected.phone],
                  ["Chi nhánh", selected.branch],
                  ["Kênh đặt hàng", selected.channel],
                  ["Thời gian", selected.time],
                  ["Trạng thái", statusConfig[selected.status].label],
                ].map(([k, v]) => (
                  <div key={k}>
                    <span style={{ fontSize: "12px", color: "#9CA3AF" }}>{k}</span>
                    <div style={{ fontSize: "13.5px", fontWeight: 500, color: "#374151" }}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>Sản phẩm</p>
                <p style={{ fontSize: "13px", color: "#6B7280" }}>{selected.items}</p>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#374151" }}>Tổng cộng</span>
                <span style={{ fontSize: "18px", fontWeight: 800, color: "#0F4761" }}>{formatCurrency(selected.total)}</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setSelected(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600" style={{ fontSize: "13.5px" }}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
