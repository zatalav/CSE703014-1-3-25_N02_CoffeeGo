import { Coffee, LayoutDashboard, Map, Package, User } from "lucide-react";
import { t } from "./theme";
import type { PageType } from "../App";
import type { Order } from "./types";

interface Props {
  currentPage: PageType;
  navigate: (page: PageType) => void;
  orders: Order[];
}

const items: { key: PageType; label: string; icon: any }[] = [
  { key: "dashboard", label: "Tong quan", icon: LayoutDashboard },
  { key: "orders", label: "Don hang", icon: Package },
  { key: "map", label: "Ban do", icon: Map },
  { key: "profile", label: "Ho so", icon: User },
];

export default function Sidebar({ currentPage, navigate, orders }: Props) {
  const activeCount = orders.filter((order) => order.status === "picked" || order.status === "delivering").length;

  return (
    <aside className="flex flex-col shrink-0" style={{ width: 260, background: t.surface, borderRight: `1px solid ${t.border}` }}>
      <div className="flex items-center gap-3 px-6" style={{ height: 72, borderBottom: `1px solid ${t.border}` }}>
        <div className="flex items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: t.accentSoft, border: `1px solid ${t.accentBorder}` }}>
          <Coffee size={18} style={{ color: t.accent }} />
        </div>
        <div>
          <div style={{ color: t.text, fontWeight: 600, letterSpacing: 0 }}>CoffeeGo</div>
          <div style={{ color: t.textDim, fontSize: 12 }}>Delivery Portal</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.key;
          const badge = item.key === "orders" ? activeCount : 0;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.key)}
              className="w-full flex items-center gap-3 px-3 rounded-lg transition-colors"
              style={{
                height: 40,
                background: active ? t.surface3 : "transparent",
                color: active ? t.text : t.textMuted,
                border: `1px solid ${active ? t.border : "transparent"}`,
                fontSize: 14,
                fontWeight: active ? 500 : 400,
              }}
            >
              <Icon size={18} style={{ color: active ? t.accent : t.textMuted }} />
              <span className="flex-1 text-left">{item.label}</span>
              {badge > 0 && (
                <span className="flex items-center justify-center rounded-md" style={{ minWidth: 22, height: 20, padding: "0 6px", background: t.accentSoft, color: t.accent, fontSize: 11, fontWeight: 600, border: `1px solid ${t.accentBorder}` }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
